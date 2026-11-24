import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { giveBackLoyaltyPoints } from "../workflows/utils/give-back-order-credits"

/**
 * A CANCELLED ORDER GIVES ITS POINTS BACK (card dfb79916). The order carries the cart's credit line (complete-cart copies
 * it, with `metadata.cart_id`), and the ledger gives back what that cart's redemption took, once: the key is the cart, so
 * a repeated event stores nothing. Returns of single items are not here yet, as with the gift card.
 *
 * A failure is logged, not thrown: the cancellation itself stands; the log names the order, the customer and the points,
 * so they can be put back by hand.
 */
export default async function orderCanceledLoyalty({ event, container }: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  if (!orderId) return
  await giveBackLoyaltyPoints(container, orderId)
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
