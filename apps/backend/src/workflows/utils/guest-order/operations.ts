import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import { ORDER_BUSINESS_STATUS_LABELS, type OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { medusaNumber } from "../medusa-number"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"
import { lineTitle } from "../webshop-mail/operations"
import type { GuestOrderDeps, GuestOrderSource, GuestOrderStatus } from "./lookup"

/**
 * The Medusa side of the guest order lookup. It asks for the fields the customer-safe view names and
 * for NO address, name or phone field: what is not requested cannot leak by a later edit of the view.
 */
const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "payment_status",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
]

const label = (status: string): string => ORDER_BUSINESS_STATUS_LABELS[status as OrderBusinessStatus] ?? status

/** The shipping option ids that play the store pickup role (by id, never by name: names are translated and edited). */
const storePickupIds = (): Set<string> =>
  new Set(
    resolveShippingOptionRoleBindings()
      .filter((binding) => binding.role === "PICKUP")
      .map((binding) => binding.id),
  )

const sourceOf = (order: any): GuestOrderSource => {
  const method = (order.shipping_methods ?? []).filter(Boolean).at(-1)
  return {
    id: order.id,
    display_id: order.display_id,
    email: order.email ?? null,
    created_at: order.created_at ?? null,
    total: medusaNumber(order.total, `The total of order ${order.id}`),
    currency_code: String(order.currency_code ?? "huf"),
    payment_status: typeof order.payment_status === "string" ? order.payment_status : null,
    items: (order.items ?? []).filter(Boolean).map((item: any) => ({
      id: String(item.id),
      title: lineTitle(item),
      quantity: medusaNumber(item.quantity, `The quantity of item ${item.id}`),
      total: medusaNumber(item.total, `The total of item ${item.id}`),
    })),
    shipping_method: method
      ? {
          name: String(method.name ?? ""),
          data: method.data ?? null,
          store_pickup: storePickupIds().has(String(method.shipping_option_id ?? "")),
        }
      : null,
    metadata: order.metadata ?? null,
  }
}

export const guestOrderOperations = (container: MedusaContainer): GuestOrderDeps => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const load = async (filters: Record<string, unknown>): Promise<GuestOrderSource[]> => {
    const { data } = await query.graph({
      entity: "order",
      filters,
      fields: ORDER_FIELDS,
    })
    return ((data ?? []) as any[]).filter(Boolean).map(sourceOf)
  }
  return {
    findByDisplayId: async (displayId) => (await load({ display_id: displayId }))[0] ?? null,
    siblingsOf: async (orderId) => {
      const { data: own } = await query.graph({
        entity: "order_cart",
        filters: { order_id: orderId },
        fields: ["cart_id"],
      })
      const cartId = (own?.[0] as { cart_id?: string } | undefined)?.cart_id
      if (!cartId) return []
      const { data: links } = await query.graph({
        entity: "order_cart",
        filters: { cart_id: cartId },
        fields: ["order_id"],
      })
      const ids = ((links ?? []) as { order_id?: string }[])
        .map((link) => link.order_id)
        .filter((id): id is string => Boolean(id) && id !== orderId)
      return ids.length ? load({ id: ids }) : []
    },
    statusOf: async (orderId): Promise<GuestOrderStatus | null> => {
      const service = container.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
      try {
        const { status, history } = await service.retrieveOrderBusinessStatusForOrder(orderId)
        return {
          status: String(status.status),
          label: label(status.status),
          updated_at: new Date(status.updated_at).toISOString(),
          history: history.map((row: any) => ({
            to_label: label(row.to_status),
            created_at: new Date(row.created_at).toISOString(),
          })),
        }
      } catch (error) {
        // an order without a status yet is not an error here (the customer view does the same)
        if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) return null
        throw error
      }
    },
  }
}
