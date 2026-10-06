import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { cartOfOrder, completeSplitForCart } from "../complete-split-for-cart"
import type { PaymentRole } from "../payment-eligibility"
import { buildProviderRoleMap } from "../payment-providers"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import { isCashOnDeliveryFeeLineItem } from "../cod-fee-line-item"
import { medusaNumber } from "../medusa-number"
import type { LoadedOrder, LoadedPayment, OrderMailDeps, RefundMailDeps } from "./prepare"
import type { ShippedDeps, ShippedOrder } from "./shipped"
import type { OrderSplitMailDeps } from "./order-split-mail"
import type { PaymentDelayedDeps } from "./payment-delayed-mail"
import type { PaymentLinkMailDeps } from "./payment-link-mail"
import type { StatusMailDeps } from "./status-mail"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "total",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "shipping_methods.id",
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
      total: medusaNumber(order.total, `The total of order ${order.id}`),
      items: (order.items ?? []).filter(Boolean).map((item: any) => ({
        title: lineTitle(item),
        quantity: medusaNumber(item.quantity, `The quantity of item ${item.id}`),
        total: medusaNumber(item.total, `The total of item ${item.id}`),
      })),
      shipping: (order.shipping_methods ?? []).filter(Boolean).map((method: any) => ({
        name: String(method.name ?? ""),
        amount: medusaNumber(method.total, `The total of shipping method ${method.id}`),
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
        amount: medusaNumber(refund.amount, `The amount of refund ${refund.id}`),
        created_at: refund.created_at ?? null,
      })),
      session_data: payment.payment_session?.data ?? null,
      payment_data: payment.data ?? null,
      order: order?.id ? { id: order.id, display_id: order.display_id, email: order.email ?? null } : null,
    }
  },
})

/*
  THE MODULE'S OWN ANSWER IS AMBIGUOUS, SO WE ASK. Measured in
  @medusajs/notification 2.20.1 (createNotifications_): a key already sent
  creates nothing (empty answer), and a key whose earlier send FAILED is sent
  again, also with an empty answer. So "already sent" is read from the
  notification list: a notification matching the filter whose status is not
  failure. The `idempotency_key` filter is the one the module filters on
  internally; the public filter type does not name it, hence the cast.
*/
const notificationSent = async (container: MedusaContainer, filters: Record<string, unknown>): Promise<boolean> => {
  const notifications = container.resolve(Modules.NOTIFICATION) as unknown as {
    listNotifications(filters: Record<string, unknown>): Promise<{ status?: string }[]>
  }
  const found = await notifications.listNotifications(filters)
  return found.some((notification) => notification.status !== "failure")
}

/** The Medusa side of the "feladtuk" mail (`prepareShippedMail`). */
export const shippedMailOperations = (container: MedusaContainer): ShippedDeps => ({
  loadOrder: async (orderId): Promise<ShippedOrder | null> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "items.id",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "items.metadata",
        "shipping_address.postal_code",
        "shipping_address.city",
        "shipping_address.address_1",
        "shipping_methods.name",
        "shipping_methods.data",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.canceled_at",
        "payment_collections.payment_sessions.provider_id",
      ],
    })
    const order = data?.[0] as any
    if (!order) return null
    const method = (order.shipping_methods ?? []).filter(Boolean).at(-1)
    const point = (key: string) => {
      const p = method?.data?.[key]
      return p?.name
        ? {
            name: String(p.name),
            address: String(p.address ?? ""),
            // a GLS point's kind (G1), for the mail's logo
            type: typeof p.type === "string" ? p.type : null,
          }
        : null
    }
    const address = order.shipping_address
    return {
      id: order.id,
      display_id: order.display_id,
      email: order.email ?? null,
      total: medusaNumber(order.total, `The total of order ${order.id}`),
      cash_on_delivery: roleOf(order, buildProviderRoleMap()) === "COD",
      items: (order.items ?? []).filter(Boolean).map((item: any) => ({
        title: lineTitle(item),
        quantity: medusaNumber(item.quantity, `The quantity of item ${item.id}`),
        fee: isCashOnDeliveryFeeLineItem(item),
      })),
      method_name: String(method?.name ?? ""),
      foxpost_point: point("foxpost_pickup_point"),
      gls_point: point("gls_pickup_point"),
      shipping_address: [
        [address?.postal_code, address?.city].filter(Boolean).join(" "),
        address?.address_1,
      ]
        .filter(Boolean)
        .join(", "),
    }
  },

  alreadySent: (key) => notificationSent(container, { idempotency_key: key }),
})

/** The Medusa side of the status mails (`prepareStatusMail`). */
export const statusMailOperations = (container: MedusaContainer): StatusMailDeps => ({
  loadOrder: orderMailOperations(container).loadOrder,
  alreadySent: (key) => notificationSent(container, { idempotency_key: key }),
  shippedMailSent: (orderId) => notificationSent(container, { resource_id: orderId, template: "order-shipped" }),
})

/** The Medusa side of the "csúszik" mail (`preparePaymentDelayedMail`). */
export const paymentDelayedMailOperations = (container: MedusaContainer): PaymentDelayedDeps => ({
  loadOrder: orderMailOperations(container).loadOrder,
  alreadySent: (key) => notificationSent(container, { idempotency_key: key }),
})

/** The Medusa side of the split notice (`prepareOrderSplitMail`). */
export const orderSplitMailOperations = (container: MedusaContainer): OrderSplitMailDeps => ({
  loadOrder: orderMailOperations(container).loadOrder,
  alreadySent: (key) => notificationSent(container, { idempotency_key: key }),
})

/** The Medusa side of the payment link's mail (`preparePaymentLinkMail`). */
export const paymentLinkMailOperations = (container: MedusaContainer): PaymentLinkMailDeps => ({
  loadOrder: orderMailOperations(container).loadOrder,
  alreadySent: (key) => notificationSent(container, { idempotency_key: key }),
})
