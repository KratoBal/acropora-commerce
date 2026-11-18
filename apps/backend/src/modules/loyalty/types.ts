/**
 * THE LOYALTY LEDGER'S VOCABULARY (card dfb79916; Balázs, 2026-11-18 21:30 UTC: the points are wanted, can be credited
 * by hand, and can pay for shipping too). One kind per way a balance can move. Only `adjustment` is written today
 * (the OS credits or debits by hand); the other three are named here so the table never needs a second vocabulary:
 * `accrual` (earned by an order), `redemption` (spent in a cart), `reversal` (taken back, e.g. a failed cash-on-delivery
 * order: D-2026-08-23-25, rule 6).
 */
export const LOYALTY_KINDS = ["accrual", "redemption", "adjustment", "reversal"] as const
export type LoyaltyKind = (typeof LOYALTY_KINDS)[number]

/** A sanity bound, not a business rule: a mistyped extra zero is refused before it is stored. */
export const MAX_POINTS = 10_000_000
export const REASON_MAX = 500
export const REFERENCE_MAX = 120
