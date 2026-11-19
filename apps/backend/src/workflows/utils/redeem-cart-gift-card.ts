import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

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
  cart: { id: string; credit_lines?: (CreditLineRow | null)[] | null },
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
  // may not change the cart, but it may refuse: the customer applies the card again, and it is capped then. The total
  // is READ here (as assertCardShare reads it), not taken from the hook's cart: a missing field there would read 0 and
  // the guard would never fire (barracuda, #818 v2).
  const now = await cartNow(cart.id, container)
  // AN ALREADY COMPLETED CART TAKES NOTHING (barracuda, #818 v4). Medusa's complete-cart runs the validate hook BEFORE
  // its `when("create-order", !orderId)` (core-flows 2.22.4, cart/workflows/complete-cart.js), so a second completion
  // of a finished cart reaches here too, after the lock (`acquireLockStep({ key: input.id })`) let it in. If the credit
  // was changed in between (a POST while the first one ran), the B branch would void what the order carries and take
  // another amount. The order exists: its redemption is the one that stands.
  if (now.completed) return null
  const before = now.beforeCredits
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

/**
 * The cart as it is now: whether it is completed, and what it pays before its credit lines. A cart that cannot be read
 * is refused, not let through.
 */
async function cartNow(
  cartId: string,
  container: Container
): Promise<{ completed: boolean; beforeCredits: number }> {
  const query = container.resolve<{
    graph: (input: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
  }>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at", "total", "credit_line_total"],
    filters: { id: cartId },
  })
  const row = data?.[0] as
    | { completed_at?: unknown; total?: unknown; credit_line_total?: unknown }
    | undefined
  if (!row || row.total === null || row.total === undefined)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The total of cart ${cartId} could not be read; the gift card is not charged without it.`
    )
  return {
    completed: !!row.completed_at,
    beforeCredits: amountOf(row.total) + amountOf(row.credit_line_total),
  }
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
