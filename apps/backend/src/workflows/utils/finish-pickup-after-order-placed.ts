import { PICKUP_CART_METADATA_KEY } from "./split-completion"

/**
 * THE PICKUP ORDER IS FINISHED WHEN THE SHIPPED ORDER IS PLACED, WHOEVER PLACED
 * IT (acrobot 25657, a condition before the mixed cart goes live).
 *
 * A mixed cart's one Stripe payment belongs to the SHIPPED cart's session. With
 * the Stripe webhook on, Medusa's `process-payment` completes that cart by
 * itself (`completeCartAfterPayment`) once the card is held; the pickup cart
 * was completed only by our `complete-split` route, which the customer's
 * browser calls. A customer who closes the tab after paying would leave the
 * shipped order placed and the animal's order missing, its money in the hold,
 * and the capture at Kiszállítás stuck on "no pickup order payment".
 *
 * So `order.placed` for a cart with a pickup cart runs the same completion the
 * route runs. It is idempotent and takes the same lock: if the route is
 * placing the orders right now, this waits, then finds both and only links
 * them.
 */
export type FinishPickupDeps = {
  /** The cart the order was placed from, with its metadata; null if none. */
  cartOf(orderId: string): Promise<{ id: string; metadata: Record<string, unknown> | null } | null>
  /** The route's own completion of a split cart (`completeSplitCart`). */
  completeSplit(cartId: string): Promise<{ order_ids: string[] }>
}

export type FinishPickupResult =
  | { finished: false; reason: "no_cart" | "no_pickup_cart" }
  | { finished: true; order_ids: string[] }

export const finishPickupAfterOrderPlaced = async (
  orderId: string,
  deps: FinishPickupDeps
): Promise<FinishPickupResult> => {
  const cart = await deps.cartOf(orderId)
  if (!cart) return { finished: false, reason: "no_cart" }

  // only the shipped (parent) cart names a pickup cart; the pickup order itself does not
  const pickupCartId = cart.metadata?.[PICKUP_CART_METADATA_KEY]
  if (typeof pickupCartId !== "string" || !pickupCartId) {
    return { finished: false, reason: "no_pickup_cart" }
  }

  const result = await deps.completeSplit(cart.id)
  return { finished: true, order_ids: result.order_ids }
}
