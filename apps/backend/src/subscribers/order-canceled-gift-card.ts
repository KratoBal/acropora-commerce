import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GIFT_CARD_MODULE } from "../modules/gift-card"
import type GiftCardModuleService from "../modules/gift-card/service"
import { amountOf, giftCardCredits, type CreditLineRow } from "../workflows/utils/gift-card-credit"

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
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) return

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
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "the credit line does not name its card or its cart"
        )
      const result = await giftCards.refundGiftCard({
        gift_card_id: line.reference_id,
        amount: amountOf(line.amount),
        reference: cartId,
        key: `cancel:${orderId}:${line.id}`,
      })
      logger.info(
        `Order ${orderId} cancelled: ${amountOf(line.amount)} back on gift card ${line.reference_id}${
          result.repeated ? " (already done)" : ""
        }.`
      )
    } catch (error) {
      logger.error(
        `Order ${orderId} cancelled, but its gift card share (${amountOf(line.amount)}, card ${
          line.reference_id ?? "?"
        }) could not be put back: ${error instanceof Error ? error.message : String(error)}. Put it back by hand.`
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
