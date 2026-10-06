import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  beginOrderEditOrderWorkflow,
  confirmOrderEditRequestWorkflow,
  createOrderPaymentCollectionWorkflow,
  createOrderWorkflow,
  createPaymentSessionsWorkflow,
  orderEditUpdateItemQuantityWorkflow,
  requestOrderEditRequestWorkflow,
} from "@medusajs/medusa/core-flows"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { ensureInitialBusinessStatus } from "../ensure-initial-business-status"
import { confirmKeepingHold, orderEditHoldDecision } from "../order-edit-hold"
import { editHoldOperations } from "../order-edit-hold-operations"
import { buildProviderRoleMap, onlineCardProviderIds } from "../payment-providers"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import type { PlannedLine, SplitOperations, SplitSource } from "./split"

const ORDER_FIELDS = [
  "id",
  "status",
  "display_id",
  "metadata",
  "region_id",
  "sales_channel_id",
  "customer_id",
  "email",
  "currency_code",
  "shipping_address.*",
  "billing_address.*",
  "items.id",
  "items.variant_id",
  "items.title",
  "items.quantity",
  "items.total",
  "items.discount_total",
  "items.is_tax_inclusive",
  "items.metadata",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
  "fulfillments.id",
  "fulfillments.canceled_at",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payment_sessions.provider_id",
]

/** An address as a new order takes it: its fields, without its own id and dates. */
const copyAddress = (address: Record<string, unknown> | null | undefined) => {
  if (!address) return undefined
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...rest } = address
  return rest
}

type LoadedOrder = SplitSource & {
  region_id?: string
  sales_channel_id?: string
  customer_id?: string
  email?: string
  currency_code: string
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  item_tax_inclusive: Record<string, boolean>
  shipping_method: { name: string; shipping_option_id: string | null; data: Record<string, unknown> | null } | null
  payment_provider_id: string | null
}

const loadOrder = async (container: MedusaContainer, orderId: string): Promise<LoadedOrder | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ORDER_FIELDS })
  const order = data?.[0] as any
  if (!order) return null

  const statuses = container.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
  const [business] = await statuses.listOrderBusinessStatusModels({ order_id: orderId })

  const payments = (order.payment_collections ?? []).flatMap((c: any) => c?.payments ?? []).filter(Boolean)
  const live = payments.find((p: any) => !p.canceled_at)
  const providerId =
    live?.provider_id ??
    (order.payment_collections ?? []).flatMap((c: any) => c?.payment_sessions ?? [])[0]?.provider_id ??
    null
  const roles = buildProviderRoleMap()
  const items = (order.items ?? []).filter(Boolean)

  const reservations = items.length
    ? await container
        .resolve(Modules.INVENTORY)
        .listReservationItems({ line_item_id: items.map((item: any) => item.id) })
    : []
  const reservationLocations: Record<string, string | null> = {}
  for (const reservation of reservations as Array<{ line_item_id?: string | null; location_id: string }>) {
    if (reservation.line_item_id && !reservationLocations[reservation.line_item_id]) {
      reservationLocations[reservation.line_item_id] = reservation.location_id
    }
  }

  const method = (order.shipping_methods ?? []).filter(Boolean).at(-1) ?? null
  return {
    id: order.id,
    status: order.status,
    display_id: order.display_id,
    business_status: ((business as { status?: string } | undefined)?.status ?? null) as OrderBusinessStatus | null,
    metadata: order.metadata ?? null,
    fulfillments: order.fulfillments ?? [],
    items: items.map((item: any) => ({
      id: item.id,
      variant_id: item.variant_id ?? null,
      title: item.title,
      quantity: Number(item.quantity),
      total: Number(item.total),
      discount_total: Number(item.discount_total ?? 0),
      metadata: item.metadata ?? null,
    })),
    payment_role: providerId ? (roles.get(providerId) ?? (providerId === STRIPE_PROVIDER_ID ? "ONLINE_CARD" : null)) : null,
    paid: payments.some((p: any) => p.captured_at && !p.canceled_at),
    reservation_locations: reservationLocations,
    region_id: order.region_id,
    sales_channel_id: order.sales_channel_id,
    customer_id: order.customer_id,
    email: order.email,
    currency_code: order.currency_code,
    shipping_address: order.shipping_address,
    billing_address: order.billing_address,
    item_tax_inclusive: Object.fromEntries(items.map((item: any) => [item.id, item.is_tax_inclusive !== false])),
    shipping_method: method
      ? { name: method.name, shipping_option_id: method.shipping_option_id ?? null, data: method.data ?? null }
      : null,
    payment_provider_id: providerId,
  }
}

const setMetadata = (container: MedusaContainer) => async (orderId: string, metadata: Record<string, unknown>) => {
  await container.resolve(Modules.ORDER).updateOrders([{ id: orderId, metadata }])
}

/**
 * A's lines to their new quantities, through a Medusa order edit: begin,
 * set the quantities, request, confirm. The confirm takes the same path as the
 * admin's (`order-edit-confirm-keeps-hold.ts`): an uncaptured card hold stays.
 */
const reduceLines = (container: MedusaContainer) => async (
  orderId: string,
  remaining: Array<{ item_id: string; quantity: number }>,
  actor: string
) => {
  const order = await loadOrder(container, orderId)
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const current = new Map(order.items.map((item) => [item.id, item.quantity]))
  const changes = remaining.filter((line) => current.has(line.item_id) && current.get(line.item_id) !== line.quantity)
  if (!changes.length) return

  await beginOrderEditOrderWorkflow(container).run({
    input: { order_id: orderId, created_by: actor, description: "Szétbontás" },
  })
  await orderEditUpdateItemQuantityWorkflow(container).run({
    input: { order_id: orderId, items: changes.map((line) => ({ id: line.item_id, quantity: line.quantity })) },
  })
  await requestOrderEditRequestWorkflow(container).run({ input: { order_id: orderId, requested_by: actor } })

  const ops = editHoldOperations(container)
  const decision = await orderEditHoldDecision(orderId, ops, onlineCardProviderIds())
  if (decision.action === "refuse") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, decision.message)
  const confirm = () => confirmOrderEditRequestWorkflow(container).run({ input: { order_id: orderId, confirmed_by: actor } })
  if (decision.action === "pass") await confirm()
  else await confirmKeepingHold(decision.collectionId, ops, confirm)
}

/**
 * B: the moved lines at A's price per unit, A's shipping method and point at
 * 0 Ft (D1), its lines reserved where A's were, and a payment of A's kind for
 * its own total (cash on delivery without a second fee, D3; pay at the shop).
 * The `createOrderWorkflow` hook gives it "Feldolgozásra vár".
 */
const createSplitOrder = (container: MedusaContainer) => async (
  sourceOrder: SplitSource,
  moved: PlannedLine[],
  metadata: Record<string, unknown>
) => {
  const source = sourceOrder as LoadedOrder
  if (!source.payment_provider_id) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Order ${source.id} has no payment to copy`)
  }
  const { result: created } = await createOrderWorkflow(container).run({
    input: {
      region_id: source.region_id,
      sales_channel_id: source.sales_channel_id,
      customer_id: source.customer_id,
      email: source.email,
      currency_code: source.currency_code,
      shipping_address: copyAddress(source.shipping_address) as never,
      billing_address: copyAddress(source.billing_address) as never,
      items: moved.map((line) => ({
        variant_id: line.variant_id ?? undefined,
        title: line.title,
        quantity: line.quantity,
        unit_price: line.unit_price,
        is_tax_inclusive: source.item_tax_inclusive[line.from_item_id] ?? true,
        metadata: { ...(line.metadata ?? {}), acropora_split_from_item_id: line.from_item_id },
      })),
      shipping_methods: source.shipping_method
        ? [
            {
              name: source.shipping_method.name,
              shipping_option_id: source.shipping_method.shipping_option_id ?? undefined,
              amount: 0,
              data: source.shipping_method.data ?? undefined,
            },
          ]
        : [],
      metadata,
    } as never,
  })
  const order = created as unknown as { id: string; total: unknown; items?: Array<{ id: string; variant_id?: string | null; metadata?: Record<string, unknown> | null }> }

  // the reservations, where A's were
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const reservations: Array<{ line_item_id: string; inventory_item_id: string; location_id: string; quantity: number }> = []
  for (const item of order.items ?? []) {
    const line = moved.find((m) => m.from_item_id === item.metadata?.acropora_split_from_item_id)
    if (!line?.location_id || !item.variant_id) continue
    const { data } = await query.graph({
      entity: "product_variant",
      filters: { id: item.variant_id },
      fields: ["manage_inventory", "inventory_items.inventory_item_id", "inventory_items.required_quantity"],
    })
    const variant = data?.[0] as any
    if (!variant?.manage_inventory) continue
    for (const link of variant.inventory_items ?? []) {
      if (!link?.inventory_item_id) continue
      reservations.push({
        line_item_id: item.id,
        inventory_item_id: link.inventory_item_id,
        location_id: line.location_id,
        quantity: line.quantity * Number(link.required_quantity ?? 1),
      })
    }
  }
  if (reservations.length) await container.resolve(Modules.INVENTORY).createReservationItems(reservations)

  // the payment, of A's kind, for B's own total
  const { result: collections } = await createOrderPaymentCollectionWorkflow(container).run({
    input: { order_id: order.id, amount: Number(order.total) },
  })
  const collection = (Array.isArray(collections) ? collections[0] : collections) as { id?: string } | undefined
  if (!collection?.id) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `No payment collection for order ${order.id}`)
  const { result: session } = await createPaymentSessionsWorkflow(container).run({
    input: { payment_collection_id: collection.id, provider_id: source.payment_provider_id },
  })
  await container.resolve(Modules.PAYMENT).authorizePaymentSession((session as { id: string }).id, {})

  return { id: order.id }
}

export const splitOperations = (container: MedusaContainer): SplitOperations => ({
  loadOrder: (orderId) => loadOrder(container, orderId),
  setMetadata: setMetadata(container),
  reduceLines: reduceLines(container),
  createSplitOrder: createSplitOrder(container),
  startBusinessStatus: async (orderId) => {
    await ensureInitialBusinessStatus(container, orderId)
  },
  orderSummary: async (orderId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ["display_id", "total"] })
    const order = data?.[0] as { display_id: number | string; total: unknown } | undefined
    return order ? { display_id: order.display_id, total: Number(order.total) } : null
  },
})
