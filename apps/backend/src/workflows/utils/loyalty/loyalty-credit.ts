import { amountOf, type CreditLineRow } from "../gift-card-credit"

/**
 * LOYALTY POINTS ON A CART (card dfb79916; Balázs 2026-10-06 16:44 UTC: "a pontjait beválthatja a szállításra is").
 * Points pay like a gift card does: a cart credit line, so they cover whatever is left after the price, the promotions,
 * the shipping and the cash-on-delivery fee, shipping included (a credit line is tied to no item). A means of payment,
 * not a discount: whether the VAT base shrinks (a price cut) or the full amount stays invoiced (a means of payment) is
 * the owner's and the accountant's question (open, B), and this first version is the second reading, the gift card's.
 *
 * `reference = "loyalty_points"`, `reference_id` the customer, `metadata` the points and the cart. Nothing is taken from
 * the ledger when the credit line is made: only when the cart is completed (`redeem-cart-loyalty.ts`).
 */
export const LOYALTY_CREDIT_REFERENCE = "loyalty_points"

/**
 * THE RULES ARE THE TODAY'S LIVE UNAS SETTING (docs/husegpont-mai-szabalyok-unas.md, Balázs's screenshot of 2026-08-22;
 * acrobot 2026-11-19 09:49), carried over with ONE change (Balázs 2026-11-18 21:30 UTC, card 790da0cd): the points may
 * pay for the shipping too. They are SETTINGS with these defaults, not numbers in the logic. The redemption itself is
 * OFF until `LOYALTY_REDEMPTION_ENABLED=true` (the test shop switches it on; the live shop waits for the owner).
 *
 *   1 point = 1 Ft (the existing balances move over without a dispute)
 *   redeemable only in an order of at least 30 000 Ft, at least 100 points at a time, up to 100 percent of the total
 *   no expiry
 */
export type LoyaltySettings = {
  enabled: boolean
  /** forint per point */
  value: number
  /** the cart's total before credits must be at least this (forint) */
  minOrder: number
  minPoints: number
  /** the share of the total that points may pay, 1 to 100 */
  maxPercent: number
}

export const LOYALTY_DEFAULTS: LoyaltySettings = { enabled: false, value: 1, minOrder: 30_000, minPoints: 100, maxPercent: 100 }

/** A positive whole number from the environment, or the default: a malformed setting is the default, never a guess. */
const whole = (raw: string | undefined, fallback: number, max: number): number => {
  const text = raw?.trim()
  if (!text || !/^\d+$/.test(text)) return fallback
  const value = Number(text)
  return Number.isSafeInteger(value) && value >= 1 && value <= max ? value : fallback
}

export const loyaltySettings = (env: Record<string, string | undefined> = process.env): LoyaltySettings => ({
  enabled: env.LOYALTY_REDEMPTION_ENABLED?.trim().toLowerCase() === "true",
  value: whole(env.LOYALTY_POINT_VALUE_HUF, LOYALTY_DEFAULTS.value, 1_000_000),
  minOrder: whole(env.LOYALTY_MIN_ORDER_HUF, LOYALTY_DEFAULTS.minOrder, 1_000_000_000),
  minPoints: whole(env.LOYALTY_MIN_POINTS, LOYALTY_DEFAULTS.minPoints, 1_000_000_000),
  maxPercent: whole(env.LOYALTY_MAX_PERCENT, LOYALTY_DEFAULTS.maxPercent, 100),
})

export const loyaltyCredits = (lines: (CreditLineRow | null | undefined)[] | null | undefined) =>
  (lines ?? []).filter((line): line is CreditLineRow => !!line && line.reference === LOYALTY_CREDIT_REFERENCE)

/** The points a credit line stands for. */
export const pointsOfCredit = (line: CreditLineRow): number => {
  const points = Number(line.metadata?.points)
  return Number.isInteger(points) && points > 0 ? points : 0
}

/**
 * THE MOST POINTS A CART CAN PAY WITH, from what it pays before credits (`beforeCredits`, forint, shipping and fees in)
 * and the customer's balance. Whole points; 0 means "none": the cart is under the order minimum, the share rounds below
 * the minimum points, or the balance is.
 */
export const maxPoints = (input: { beforeCredits: number; balance: number; settings: LoyaltySettings }): number => {
  const s = input.settings
  if (input.beforeCredits < s.minOrder) return 0
  const byCart = Math.floor((input.beforeCredits * s.maxPercent) / 100 / s.value)
  const points = Math.min(byCart, Math.floor(input.balance))
  return points >= s.minPoints ? points : 0
}

/**
 * What a cart's points credit may be after the cart changed. The plan is the gift card's three answers, over WHOLE
 * points: keep, cap (the credit becomes the most the cart now takes, never more than it carried), remove (the cart no
 * longer qualifies: under the order minimum, or the share below the minimum points).
 */
export function loyaltyCreditPlan(input: {
  totalWithCredits: number
  creditLineTotal: number
  /** the credit lines of OTHER instruments (a gift card): they take their share first */
  otherCredits?: number
  credits: CreditLineRow[]
  settings: LoyaltySettings
}):
  | { action: "keep" }
  | { action: "cap"; points: number; line: CreditLineRow; removeIds: string[] }
  | { action: "remove"; removeIds: string[] } {
  if (!input.credits.length) return { action: "keep" }
  const before = input.totalWithCredits + input.creditLineTotal - (input.otherCredits ?? 0)
  const ids = input.credits.map((line) => line.id)
  const first = input.credits[0]!
  const carried = pointsOfCredit(first)
  const room = maxPoints({ beforeCredits: before, balance: Number.MAX_SAFE_INTEGER, settings: input.settings })
  if (carried < 1) return { action: "remove", removeIds: ids }
  const credited = input.credits.reduce((sum, line) => sum + amountOf(line.amount), 0)
  if (input.credits.length === 1 && carried <= room && credited <= before) return { action: "keep" }
  const points = Math.min(room, carried)
  return points >= input.settings.minPoints
    ? { action: "cap", points, line: first, removeIds: ids }
    : { action: "remove", removeIds: ids }
}

export const LOYALTY_OFF_MESSAGE = "A hűségpont-beváltás még nincs bekapcsolva."
export const LOYALTY_LOGIN_MESSAGE = "A pontok beváltásához be kell jelentkezni."
export const LOYALTY_FOREIGN_CART_MESSAGE = "Ez a kosár nem a bejelentkezett vevőé."
export const LOYALTY_MIXED_CART_MESSAGE =
  "A hűségpont élő állatot és szállítható árut együtt tartalmazó rendelésnél egyelőre nem használható."
export const LOYALTY_WITH_GIFT_CARD_MESSAGE =
  "Ajándékkártyával együtt a hűségpont egyelőre nem használható: vedd le az ajándékkártyát, vagy a pontot."
export const loyaltyUnderMinimumMessage = (s: LoyaltySettings) =>
  `A pontok ${s.minOrder.toLocaleString("hu-HU")} Ft feletti rendelésnél, legalább ${s.minPoints} ponttal válthatók be.`
