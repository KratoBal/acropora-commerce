import { BigNumber } from "@medusajs/framework/utils"

/**
 * A GIFT CARD ON A CART (card 495c0007): a cart credit line with `reference = "gift_card"` and `reference_id` the
 * card. A means of payment, not a discount: it pays what is left after the price, the promotions, the shipping and
 * the cash-on-delivery fee, so it is capped by the cart's total before credits, and it is re-capped whenever the cart
 * changes. One gift card per cart in this first version: applying another replaces it.
 *
 * Medusa 2.22 adds no tax to a credit line (its credit-line tax rate is a TODO fixed at 0), so a 1 000 Ft credit line
 * takes exactly 1 000 Ft off the total.
 *
 * `metadata.cart_id` travels with the line onto the order (`complete-cart` copies the metadata), so a cancellation
 * can refund the card against the same redemption (`refundGiftCard` needs the cart the amount came off).
 */
export const GIFT_CARD_CREDIT_REFERENCE = "gift_card"

export type CreditLineRow = {
  id: string
  amount?: unknown
  reference?: string | null
  reference_id?: string | null
  metadata?: Record<string, unknown> | null
}

/** A money value as Medusa hands it (number, string, BigNumber or its raw form), as a number. */
export const amountOf = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  return Number(new BigNumber(value as never).numeric)
}

export const giftCardCredits = (lines: (CreditLineRow | null | undefined)[] | null | undefined) =>
  (lines ?? []).filter(
    (line): line is CreditLineRow => !!line && line.reference === GIFT_CARD_CREDIT_REFERENCE
  )

/**
 * What a cart's gift card credit may be: the card's share of the total before credits, never more. `totalWithCredits`
 * is Medusa's `total` (credits already taken off), `creditLineTotal` its `credit_line_total`.
 *
 *   keep      the credit fits; nothing to do
 *   cap       the cart got cheaper: the credit becomes `amount` (the whole total before credits)
 *   remove    nothing is left to pay
 */
export function giftCardCreditPlan(input: {
  totalWithCredits: number
  creditLineTotal: number
  credits: CreditLineRow[]
}):
  | { action: "keep" }
  | { action: "cap"; amount: number; line: CreditLineRow; removeIds: string[] }
  | { action: "remove"; removeIds: string[] } {
  if (!input.credits.length) return { action: "keep" }
  const before = input.totalWithCredits + input.creditLineTotal
  const ids = input.credits.map((line) => line.id)
  if (before < 1) return { action: "remove", removeIds: ids }
  const credited = input.credits.reduce((sum, line) => sum + amountOf(line.amount), 0)
  if (input.credits.length === 1 && credited <= before) return { action: "keep" }
  return {
    action: "cap",
    amount: Math.min(Math.floor(before), Math.floor(amountOf(input.credits[0]!.amount))),
    line: input.credits[0]!,
    removeIds: ids,
  }
}

export const GIFT_CARD_MIXED_CART_MESSAGE =
  "Az ajándékkártya élő állatot és szállítható árut együtt tartalmazó rendelésnél egyelőre nem használható."

export const GIFT_CARD_UNUSABLE_MESSAGE =
  "Ez az ajándékkártya nem használható: hibás a kód, lejárt, ki van kapcsolva, vagy nincs rajta egyenleg."
