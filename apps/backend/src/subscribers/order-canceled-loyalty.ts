import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"
import { loyaltyCredits, pointsOfCredit } from "../workflows/utils/loyalty/loyalty-credit"
import type { CreditLineRow } from "../workflows/utils/gift-card-credit"

/**
 * A CANCELLED ORDER GIVES ITS POINTS BACK (card dfb79916). The order carries the cart's credit line (complete-cart copies
 * it, with `metadata.cart_id`), and the ledger gives back what that cart's redemption took, once: the key is the cart, so
 * a repeated event stores nothing. Returns of single items are not here yet, as with the gift card.
 *
 * A failure is logged, not thrown: the cancellation itself stands; the log names the order, the customer and the points,
 * so they can be put back by hand.
 */
export default async function orderCanceledLoyalty({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "credit_lines.*"],
    filters: { id: orderId },
  })
  const credits = loyaltyCredits((data[0] as { credit_lines?: CreditLineRow[] | null } | undefined)?.credit_lines)
  if (!credits.length) return

  const loyalty = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  for (const line of credits) {
    const cartId = line.metadata?.cart_id
    try {
      if (!line.reference_id || typeof cartId !== "string")
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "the credit line does not name its customer or its cart")
      const result = await loyalty.reversePointsRedemption({
        customer_id: line.reference_id,
        cart_id: cartId,
        order_id: orderId,
      })
      logger.info(
        `Order ${orderId} cancelled: ${result.points} points back to customer ${line.reference_id}${
          result.repeated ? " (already done)" : ""
        }.`,
      )
    } catch (error) {
      logger.error(
        `Order ${orderId} cancelled, but its points (${pointsOfCredit(line)}, customer ${
          line.reference_id ?? "?"
        }) could not be put back: ${error instanceof Error ? error.message : String(error)}. Put them back by hand.`,
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
