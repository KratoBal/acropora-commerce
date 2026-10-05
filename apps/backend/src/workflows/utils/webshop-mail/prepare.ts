import { STRIPE_PROVIDER_ID } from "../stripe-config"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../split-completion"
import { type MailContent, type MailOrder, renderOrderPlacedMail } from "./order-placed-mail"
import { cardLast4Of, renderRefundMail } from "./refund-mail"

/**
 * WHEN A SHOP MAIL GOES, AND TO WHOM. The Medusa reads sit behind the deps, so
 * the decisions are testable without a database (`operations.ts` has them).
 *
 * Every mail carries an idempotency key (the notification module skips a key
 * it has already sent): a retried event, or both halves of a split reaching
 * here, never send the same mail twice.
 */
export type MailToSend = {
  to: string
  template: "order-placed" | "payment-refunded" | "order-shipped"
  idempotency_key: string
  resource_id: string
  content: MailContent
}

export type PrepareResult = { action: "send"; mail: MailToSend } | { action: "skip"; reason: string }

export type LoadedOrder = Omit<MailOrder, "pickup"> & { id: string; email: string | null }

export type OrderMailDeps = {
  cartOf(orderId: string): Promise<{ id: string; metadata: Record<string, unknown> | null } | null>
  /** The split's own idempotent completion (`completeSplitCart`): both orders, placed and linked. */
  completeSplit(cartId: string): Promise<{ order_ids: string[] }>
  loadOrder(orderId: string): Promise<LoadedOrder | null>
}

/**
 * A MIXED CART'S MAIL GOES FROM ITS SHIPPED ORDER, ONCE BOTH ORDERS EXIST.
 *
 * `completeCartWorkflow` emits `order.placed` for each half. The pickup half's
 * own event is skipped (its cart names a parent cart). The shipped half's
 * event runs the split's completion first, the same idempotent, locked call
 * the `order-placed-finish-pickup` subscriber makes: whoever comes second
 * finds both orders and only reads them. So the mail names both orders even
 * when the customer closed the tab after paying.
 */
export const prepareOrderPlacedMail = async (orderId: string, deps: OrderMailDeps): Promise<PrepareResult> => {
  const cart = await deps.cartOf(orderId)
  if (typeof cart?.metadata?.[PARENT_CART_METADATA_KEY] === "string") {
    return { action: "skip", reason: "pickup_half" }
  }

  let ids = [orderId]
  const pickupCart = cart?.metadata?.[PICKUP_CART_METADATA_KEY]
  if (cart && typeof pickupCart === "string" && pickupCart) {
    const { order_ids } = await deps.completeSplit(cart.id)
    ids = [orderId, ...order_ids.filter((id) => id !== orderId)]
  }

  const loaded = await Promise.all(ids.map((id) => deps.loadOrder(id)))
  if (loaded.some((order) => !order)) return { action: "skip", reason: "order_missing" }
  const orders = loaded as LoadedOrder[]

  const to = orders[0].email?.trim()
  if (!to) return { action: "skip", reason: "no_email" }

  return {
    action: "send",
    mail: {
      to,
      template: "order-placed",
      idempotency_key: `order-placed:${orderId}`,
      resource_id: orderId,
      content: renderOrderPlacedMail(
        orders.map(({ id, email: _email, ...order }) => ({ ...order, pickup: id !== orderId }))
      ),
    },
  }
}

export type LoadedPayment = {
  id: string
  provider_id: string | null
  refunds: { id: string; amount: number; created_at: string | Date | null }[]
  session_data: Record<string, unknown> | null
  payment_data: Record<string, unknown> | null
  order: { id: string; display_id: number | string; email: string | null } | null
}

export type RefundMailDeps = { loadPayment(paymentId: string): Promise<LoadedPayment | null> }

/** `payment.refunded` carries the payment's id: the mail is about its newest refund. */
export const prepareRefundMail = async (paymentId: string, deps: RefundMailDeps): Promise<PrepareResult> => {
  const payment = await deps.loadPayment(paymentId)
  if (!payment) return { action: "skip", reason: "payment_missing" }
  // Card refunds only; a cash on delivery refund goes another way (bank transfer, by hand).
  if (payment.provider_id !== STRIPE_PROVIDER_ID) return { action: "skip", reason: "not_card" }
  if (!payment.order) return { action: "skip", reason: "order_missing" }
  const to = payment.order.email?.trim()
  if (!to) return { action: "skip", reason: "no_email" }
  if (!payment.refunds.length) return { action: "skip", reason: "no_refund" }

  const time = (value: string | Date | null) => (value ? new Date(value).getTime() : 0)
  const newest = payment.refunds.reduce((latest, refund) =>
    time(refund.created_at) >= time(latest.created_at) ? refund : latest
  )

  return {
    action: "send",
    mail: {
      to,
      template: "payment-refunded",
      idempotency_key: `payment-refunded:${newest.id}`,
      resource_id: payment.order.id,
      content: renderRefundMail({
        display_id: payment.order.display_id,
        amount: newest.amount,
        refunded_total: payment.refunds.reduce((sum, refund) => sum + refund.amount, 0),
        last4: cardLast4Of([payment.session_data, payment.payment_data]),
      }),
    },
  }
}
