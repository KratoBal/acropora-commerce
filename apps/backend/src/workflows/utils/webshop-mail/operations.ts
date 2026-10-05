import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { cartOfOrder, completeSplitForCart } from "../complete-split-for-cart"
import type { PaymentRole } from "../payment-eligibility"
import { buildProviderRoleMap } from "../payment-providers"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import type { LoadedOrder, LoadedPayment, OrderMailDeps, RefundMailDeps } from "./prepare"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "total",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "shipping_methods.name",
  "shipping_methods.total",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.canceled_at",
  "payment_collections.payment_sessions.provider_id",
]

/** "Termék (változat)", the variant only when it says something the product does not. */
const lineTitle = (item: any): string => {
  const product = String(item?.product_title || item?.title || "").trim()
  const variant = String(item?.variant_title ?? "").trim()
  return variant && variant !== product && !/^default/i.test(variant) ? `${product} (${variant})` : product
}

const roleOf = (order: any, roles: Map<string, PaymentRole>): PaymentRole | null => {
  const collections = order.payment_collections ?? []
  const live = collections
    .flatMap((collection: any) => collection?.payments ?? [])
    .find((payment: any) => payment && !payment.canceled_at)
  const provider =
    live?.provider_id ??
    collections.flatMap((collection: any) => collection?.payment_sessions ?? [])[0]?.provider_id
  if (!provider) return null
  return roles.get(provider) ?? (provider === STRIPE_PROVIDER_ID ? "ONLINE_CARD" : null)
}

export const orderMailOperations = (container: MedusaContainer): OrderMailDeps => ({
  cartOf: (orderId) => cartOfOrder(container, orderId),
  completeSplit: (cartId) => completeSplitForCart(container, cartId),
  loadOrder: async (orderId): Promise<LoadedOrder | null> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ORDER_FIELDS })
    const order = data?.[0] as any
    if (!order) return null
    return {
      id: order.id,
      display_id: order.display_id,
      email: order.email ?? null,
      total: Number(order.total),
      items: (order.items ?? []).filter(Boolean).map((item: any) => ({
        title: lineTitle(item),
        quantity: Number(item.quantity),
        total: Number(item.total),
      })),
      shipping: (order.shipping_methods ?? []).filter(Boolean).map((method: any) => ({
        name: String(method.name ?? ""),
        amount: Number(method.total),
      })),
      payment: roleOf(order, buildProviderRoleMap()),
    }
  },
})

export const refundMailOperations = (container: MedusaContainer): RefundMailDeps => ({
  loadPayment: async (paymentId): Promise<LoadedPayment | null> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: payments } = await query.graph({
      entity: "payment",
      filters: { id: paymentId },
      fields: [
        "id",
        "provider_id",
        "data",
        "payment_collection_id",
        "payment_session.data",
        "refunds.id",
        "refunds.amount",
        "refunds.created_at",
      ],
    })
    const payment = payments?.[0] as any
    if (!payment) return null

    // The order is reached over the order <-> payment collection link.
    const { data: collections } = await query.graph({
      entity: "payment_collection",
      filters: { id: payment.payment_collection_id },
      fields: ["id", "order.id", "order.display_id", "order.email"],
    })
    const order = (collections?.[0] as any)?.order

    return {
      id: payment.id,
      provider_id: payment.provider_id ?? null,
      refunds: (payment.refunds ?? []).filter(Boolean).map((refund: any) => ({
        id: refund.id,
        amount: Number(refund.amount),
        created_at: refund.created_at ?? null,
      })),
      session_data: payment.payment_session?.data ?? null,
      payment_data: payment.data ?? null,
      order: order?.id ? { id: order.id, display_id: order.display_id, email: order.email ?? null } : null,
    }
  },
})
