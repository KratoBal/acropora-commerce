import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ensureInitialBusinessStatus } from "../workflows/utils/ensure-initial-business-status"

/**
 * A store order gets its first business status here.
 *
 * `completeCartWorkflow` emits `order.placed` once the order exists; it does
 * not run `createOrderWorkflow`, so the hook there never sees a store order.
 * The reasoning and the measurement are in `ensureInitialBusinessStatus`.
 *
 * A failure is logged, not thrown: the order is already placed, and a missing
 * status must not look like a failed checkout. The log names the order, so the
 * status can be set by hand.
 */
export default async function orderPlacedBusinessStatus({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id

  if (!orderId) {
    logger.error("order.placed arrived without an order id; no business status was set.")
    return
  }

  try {
    await ensureInitialBusinessStatus(container, orderId)
  } catch (error) {
    logger.error(
      `Order ${orderId} was placed, but its first business status (Feldolgozásra vár) could not be set: ${
        error instanceof Error ? error.message : String(error)
      }. The order is not affected; set the status by hand.`,
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
