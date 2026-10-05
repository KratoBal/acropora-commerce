import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { cartOfOrder, completeSplitForCart } from "../workflows/utils/complete-split-for-cart"
import { finishPickupAfterOrderPlaced } from "../workflows/utils/finish-pickup-after-order-placed"

/**
 * A mixed cart's pickup order is finished when its shipped order is placed,
 * whoever placed it (the customer's route or Medusa's Stripe webhook). See
 * `finishPickupAfterOrderPlaced`.
 *
 * A failure is logged with the order's id, not thrown: the shipped order is
 * placed either way, and the log is what lets the pickup be finished by hand.
 */
export default async function orderPlacedFinishPickup({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) return

  try {
    const result = await finishPickupAfterOrderPlaced(orderId, {
      cartOf: (id) => cartOfOrder(container, id),
      completeSplit: (cartId) => completeSplitForCart(container, cartId),
    })
    if (result.finished) {
      logger.info(`Order ${orderId}: the split's orders are ${result.order_ids.join(", ")}.`)
    }
  } catch (error) {
    logger.error(
      `Order ${orderId} was placed, but its pickup order could not be finished: ${
        error instanceof Error ? error.message : String(error)
      }. Finish it with POST /store/carts/<cart>/complete-split.`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
