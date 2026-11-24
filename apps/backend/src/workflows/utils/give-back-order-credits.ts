import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GIFT_CARD_MODULE } from "../../modules/gift-card"
import type GiftCardModuleService from "../../modules/gift-card/service"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import type LoyaltyModuleService from "../../modules/loyalty/service"
import { amountOf, giftCardCredits, type CreditLineRow } from "./gift-card-credit"
import { loyaltyCredits, pointsOfCredit } from "./loyalty/loyalty-credit"

/**
 * WHAT AN ORDER GAVE UP WHEN IT WAS PAID, GIVEN BACK: the points the customer redeemed and the gift card's share. Two callers
 * share it, so one rule has one body: the `order.canceled` subscribers (a cancelled order) and the unsuccessful close of an
 * order Medusa cannot cancel (`cancel-on-unsuccessful-close.ts`: a parcel's fulfillment is open, or the order is completed).
 *
 * IDEMPOTENT ACROSS BOTH CALLERS, which is the point of sharing it: the points are keyed by the CART (`reverse:<cart>`, one
 * reversal per cart) and the card by the order and the credit line (`cancel:<order>:<line>`), so an order that is given back
 * on the unsuccessful close and cancelled later gives nothing back twice.
 *
 * NEVER THROWS: a failure is logged with what to put back by hand. `cause` is only the log's word for why ("cancelled" for
 * the subscribers).
 */
export type GiveBackCause = "cancelled" | "closed unsuccessfully (not cancelled)"

export async function giveBackLoyaltyPoints(
  container: Pick<MedusaContainer, "resolve">,
  orderId: string,
  cause: GiveBackCause = "cancelled",
): Promise<void> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
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
        `Order ${orderId} ${cause}: ${result.points} points back to customer ${line.reference_id}${
          result.repeated ? " (already done)" : ""
        }.`,
      )
    } catch (error) {
      logger.error(
        `Order ${orderId} ${cause}, but its points (${pointsOfCredit(line)}, customer ${
          line.reference_id ?? "?"
        }) could not be put back: ${error instanceof Error ? error.message : String(error)}. Put them back by hand.`,
      )
    }
  }
}

export async function giveBackGiftCardShare(
  container: Pick<MedusaContainer, "resolve">,
  orderId: string,
  cause: GiveBackCause = "cancelled",
): Promise<void> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "credit_lines.*"],
    filters: { id: orderId },
  })
  const credits = giftCardCredits((data[0] as { credit_lines?: CreditLineRow[] | null } | undefined)?.credit_lines)
  if (!credits.length) return

  const giftCards = container.resolve<GiftCardModuleService>(GIFT_CARD_MODULE)
  for (const line of credits) {
    const cartId = line.metadata?.cart_id
    try {
      if (!line.reference_id || typeof cartId !== "string")
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "the credit line does not name its card or its cart")
      const result = await giftCards.refundGiftCard({
        gift_card_id: line.reference_id,
        amount: amountOf(line.amount),
        reference: cartId,
        key: `cancel:${orderId}:${line.id}`,
      })
      logger.info(
        `Order ${orderId} ${cause}: ${amountOf(line.amount)} back on gift card ${line.reference_id}${
          result.repeated ? " (already done)" : ""
        }.`,
      )
    } catch (error) {
      logger.error(
        `Order ${orderId} ${cause}, but its gift card share (${amountOf(line.amount)}, card ${
          line.reference_id ?? "?"
        }) could not be put back: ${error instanceof Error ? error.message : String(error)}. Put it back by hand.`,
      )
    }
  }
}
