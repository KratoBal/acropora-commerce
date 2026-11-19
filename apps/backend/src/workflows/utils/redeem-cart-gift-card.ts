import { MedusaError } from "@medusajs/framework/utils"

import { GIFT_CARD_MODULE } from "../../modules/gift-card"
import type GiftCardModuleService from "../../modules/gift-card/service"
import { amountOf, giftCardCredits, type CreditLineRow } from "./gift-card-credit"

type Container = { resolve: <T = unknown>(key: string) => T }

/** What the completion took from a card, for its compensation; null when the cart pays with no gift card. */
export type CartGiftCardRedemption = {
  gift_card_id: string
  reference: string
  amount: number
  /** The redemption was already there (a repeated completion): this run took nothing, and must not give back. */
  repeated: boolean
} | null

/**
 * TAKES THE GIFT CARD'S SHARE OFF THE CARD when the cart becomes an order (card 495c0007), in the complete-cart
 * validate hook: the last place a refusal is still free. The card is checked again here (it may have been spent,
 * disabled or expired since it was applied); the service refuses what it cannot pay, with the customer's message.
 * Keyed by the cart: a repeated completion takes nothing a second time.
 */
export async function redeemCartGiftCard(
  cart: { id: string; total?: unknown; credit_lines?: (CreditLineRow | null)[] | null },
  container: Container
): Promise<CartGiftCardRedemption> {
  const credits = giftCardCredits(cart.credit_lines)
  if (!credits.length) return null
  if (credits.length > 1)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Egy rendeléshez egy ajándékkártya használható.")
  const line = credits[0]!
  if (!line.reference_id)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Az ajándékkártya-jóváírás nem nevezi meg a kártyát.")
  const amount = amountOf(line.amount)
  // NEVER MORE THAN THE CART PAYS (barracuda, #818): the store route and the refresh hook cap the credit, but the hook
  // only logs what it cannot repair, and a path that lowers the total without a refresh would skip it. Here the hook
  // may not change the cart, but it may refuse: the customer applies the card again, and it is capped then.
  const before =
    amountOf(cart.total) +
    (cart.credit_lines ?? []).reduce((sum, credit) => sum + amountOf(credit?.amount), 0)
  if (amount > before)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Az ajándékkártya-jóváírás több, mint amit a rendelés fizet. Vedd le, és add meg újra a kártyát."
    )
  const result = await container
    .resolve<GiftCardModuleService>(GIFT_CARD_MODULE)
    .redeemGiftCard({ gift_card_id: line.reference_id, amount, reference: cart.id })
  return { gift_card_id: line.reference_id, reference: cart.id, amount, repeated: result.repeated }
}

/** The compensation: a completion rolled back gives the card's share back, so a retry can take it again. */
export async function voidCartGiftCardRedemption(
  redemption: CartGiftCardRedemption | undefined,
  container: Container
): Promise<void> {
  if (!redemption || redemption.repeated) return
  await container
    .resolve<GiftCardModuleService>(GIFT_CARD_MODULE)
    .voidGiftCardRedemption({ gift_card_id: redemption.gift_card_id, reference: redemption.reference })
}
