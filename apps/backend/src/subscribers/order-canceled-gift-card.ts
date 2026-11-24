import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { giveBackGiftCardShare } from "../workflows/utils/give-back-order-credits"

/**
 * A CANCELLED ORDER GIVES ITS GIFT CARD SHARE BACK (card 495c0007). The order carries the cart's credit line
 * (complete-cart copies it, with `metadata.cart_id`), and the refund is tied to that cart's redemption: the service
 * refuses more than was taken. The key is the order and the line, so a repeated event refunds once.
 *
 * Returns of single items are not here yet: they need the returned share per item, a separate step.
 *
 * A failure is logged, not thrown: the cancellation itself stands; the log names the order and the card, so the
 * balance can be put back by hand.
 */
export default async function orderCanceledGiftCard({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  if (!orderId) return
  await giveBackGiftCardShare(container, orderId)
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
