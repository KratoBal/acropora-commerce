import type { MedusaContainer, UpdateOrderShippingMethodDTO } from "@medusajs/framework/types"
import { ChangeActionType, ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createOrderChangeActionsWorkflow, createOrderEditShippingMethodWorkflow } from "@medusajs/medusa/core-flows"

import { getShippingPricingSettings } from "../../../modules/commerce-settings/accessor"
import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { calculateGoodsTotal } from "../goods-total"
import { loadOrderPaymentSide } from "../order-payment/operations"
import { orderPaymentView } from "../order-payment/state"
import { buildProviderRoleMap } from "../payment-providers"
import { resolveCartShippingClass } from "../resolve-cart-shipping-class"
import { runOrderEdit } from "../run-order-edit"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import type { ChangeOperations, ChangeOrder } from "./change"

const query = (container: MedusaContainer) => container.resolve(ContainerRegistrationKeys.QUERY)

const ITEM_FIELDS = [
  "items.id",
  "items.variant_id",
  "items.requires_shipping",
  "items.unit_price",
  "items.quantity",
  "items.is_tax_inclusive",
  "items.metadata",
]

const loadItems = async (container: MedusaContainer, orderId: string) => {
  const { data } = await query(container).graph({ entity: "order", filters: { id: orderId }, fields: ITEM_FIELDS })
  return (((data?.[0] as any)?.items ?? []) as any[]).filter(Boolean)
}

const loadOrder = async (container: MedusaContainer, orderId: string): Promise<ChangeOrder | null> => {
  const { data } = await query(container).graph({
    entity: "order",
    filters: { id: orderId },
    fields: [
      "id",
      "status",
      "total",
      "metadata",
      "fulfillments.id",
      "fulfillments.canceled_at",
      "shipping_methods.id",
      "shipping_methods.shipping_option_id",
      "shipping_methods.amount",
      "shipping_methods.data",
      "shipping_methods.is_tax_inclusive",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.canceled_at",
      "payment_collections.payment_sessions.provider_id",
    ],
  })
  const order = data?.[0] as any
  if (!order) return null
  const statuses = container.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
  const [business] = await statuses.listOrderBusinessStatusModels({ order_id: orderId })
  const payments = (order.payment_collections ?? []).flatMap((c: any) => c?.payments ?? []).filter(Boolean)
  const live = payments.find((p: any) => !p.canceled_at)
  const providerId =
    live?.provider_id ?? (order.payment_collections ?? []).flatMap((c: any) => c?.payment_sessions ?? [])[0]?.provider_id ?? null
  const method = (order.shipping_methods ?? []).filter(Boolean).at(-1) ?? null
  return {
    id: order.id,
    status: order.status,
    business_status: ((business as { status?: string } | undefined)?.status ?? null) as OrderBusinessStatus | null,
    fulfillments: order.fulfillments ?? [],
    metadata: order.metadata ?? null,
    total: Number(order.total),
    payment_role: providerId
      ? (buildProviderRoleMap().get(providerId) ?? (providerId === STRIPE_PROVIDER_ID ? "ONLINE_CARD" : null))
      : null,
    paid: payments.some((p: any) => p.captured_at && !p.canceled_at),
    method: method
      ? {
          id: method.id,
          shipping_option_id: method.shipping_option_id ?? null,
          amount: Number(method.amount),
          data: method.data ?? null,
          is_tax_inclusive: method.is_tax_inclusive !== false,
        }
      : null,
  }
}

/** The new method's point, through the provider's own check (as in the checkout and in #494). */
const validatePoint = (container: MedusaContainer): ChangeOperations["validatePoint"] => async (optionId, carrier, pointId, source) => {
  const { data } = await query(container).graph({
    entity: "shipping_option",
    filters: { id: optionId },
    fields: ["id", "provider_id", "data"],
  })
  const option = data?.[0] as { provider_id?: string; data?: Record<string, unknown> | null } | undefined
  if (!option?.provider_id) return { ok: false, reason: "unavailable" }
  const key = carrier === "gls" ? "gls_pickup_point" : "foxpost_pickup_point"
  try {
    const validated = await container.resolve(Modules.FULFILLMENT).validateFulfillmentData(
      option.provider_id,
      { ...(option.data ?? {}), id: (option.data as { id?: unknown } | null)?.id ?? optionId },
      { [key]: carrier === "gls" ? { id: pointId, source } : { id: pointId } },
      {} as never
    )
    return { ok: true, data: validated }
  } catch (error) {
    if (MedusaError.isMedusaError(error) && (error as MedusaError).type === MedusaError.Types.NOT_ALLOWED) {
      return { ok: false, reason: "unavailable" }
    }
    if (MedusaError.isMedusaError(error) && (error as MedusaError).type === MedusaError.Types.INVALID_DATA) {
      return { ok: false, reason: "invalid_point" }
    }
    throw error
  }
}

/**
 * The old method out and the new one in, in ONE order edit. The new method is
 * added by Medusa's own order-edit workflow at our price; its point data is
 * set on it; the old one is removed with a SHIPPING_REMOVE action, the way
 * Medusa removes an existing method from a draft order
 * (`remove-draft-order-shipping-method.js`, core-flows 2.20.1). The edit's
 * begin, request, confirm and cancel-on-failure are `runOrderEdit`.
 */
const replaceMethod = (container: MedusaContainer): ChangeOperations["replaceMethod"] => (orderId, change) =>
  runOrderEdit(container, { order_id: orderId, actor: change.actor, description: "Szállítási mód csere" }, async () => {
    await createOrderEditShippingMethodWorkflow(container).run({
      input: { order_id: orderId, shipping_option_id: change.option.id, custom_amount: change.option.amount },
    })
    const { data: changes } = await query(container).graph({
      entity: "order_change",
      filters: { order_id: orderId, status: ["pending", "requested"] },
      fields: ["id", "actions.action", "actions.reference_id"],
    })
    const orderChange = changes?.[0] as { id: string; actions?: Array<{ action: string; reference_id: string } | null> } | undefined
    const added = (orderChange?.actions ?? []).find((a) => a?.action === ChangeActionType.SHIPPING_ADD)
    if (!orderChange || !added) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `The new shipping method of order ${orderId} was not found in its edit`)
    }
    /*
      THE NEW METHOD IS PRICED LIKE THE OLD ONE (measured 2026-10-06 on the
      test shop): Medusa takes `is_tax_inclusive` from the option's calculated
      price, also for our custom amount, and gave the new method `false`. Its
      3500 Ft was then a net price: 4445 Ft with the 27% tax, and a 3295 Ft
      difference link instead of 2350. Our option amounts are the checkout's
      prices, so the new method takes the old one's flag.
    */
    const update: UpdateOrderShippingMethodDTO & { is_tax_inclusive: boolean } = {
      id: added.reference_id,
      is_tax_inclusive: change.tax_inclusive,
      ...(Object.keys(change.data).length ? { data: change.data } : {}),
    }
    await container.resolve(Modules.ORDER).updateOrderShippingMethods([update])
    await createOrderChangeActionsWorkflow(container).run({
      input: [
        {
          action: ChangeActionType.SHIPPING_REMOVE,
          reference: "order_shipping_method",
          order_change_id: orderChange.id,
          reference_id: change.old_method_id,
          order_id: orderId,
        },
      ],
    })
  })

export const shippingChangeOperations = (container: MedusaContainer): ChangeOperations => ({
  loadOrder: (orderId) => loadOrder(container, orderId),
  shippingClass: async (orderId) => {
    const items = await loadItems(container, orderId)
    return (await resolveCartShippingClass({ items } as never, container)).shipping_class
  },
  goodsTotal: async (orderId) => calculateGoodsTotal(await loadItems(container, orderId)),
  settings: () => getShippingPricingSettings(container.resolve("commerce_settings")),
  optionNames: async () => {
    const ids = resolveShippingOptionRoleBindings().map((binding) => binding.id)
    const { data } = await query(container).graph({ entity: "shipping_option", filters: { id: ids }, fields: ["id", "name"] })
    return Object.fromEntries(((data ?? []) as Array<{ id: string; name: string }>).map((option) => [option.id, option.name]))
  },
  validatePoint: validatePoint(container),
  replaceMethod: replaceMethod(container),
  payment: async (orderId) => {
    const side = await loadOrderPaymentSide(container, orderId)
    if (!side) return { state: "none", difference_due: false }
    const view = orderPaymentView(side)
    return { state: view.state, difference_due: view.due?.reason === "difference" }
  },
  setMetadata: async (orderId, metadata) => {
    await container.resolve(Modules.ORDER).updateOrders([{ id: orderId, metadata }])
  },
  now: () => new Date(),
})
