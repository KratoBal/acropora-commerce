/**
 * THE CART HOLD'S RULES, without Medusa (V2.3, card 52024fc0; plan: exchange/otletek-2026-11-04/v23-kosarfoglalas-terv.md).
 *
 * BALÁZS HAS NOT DECIDED THE NUMBERS YET (the plan's questions 1 and 2): how long a hold lasts, and whether anything
 * makes it longer. So both are configuration with the plan's proposals as defaults, and nothing extends a live hold:
 * putting the same piece in the same cart again keeps the hold's end where it was (a buyer could otherwise keep a
 * piece forever by re-adding it). Lengthening it at the checkout is a later slice, if he wants it.
 *
 * THE LIMIT PER CART is the first slice's own brake (the plan's "visszaélés" paragraph): with holds, anyone could lock
 * the whole WYSIWYG offer by putting every piece in a cart. It does not stop someone opening many carts; a per-visitor
 * limit belongs to the storefront, which sees the visitor's address (the shop sees only the storefront's server).
 */

/** The one switch: holds are made and respected only when it is "on" (test shop). Off, everything is as before. */
export const CART_HOLD_ENV = "ACROPORA_CART_HOLD"
export const CART_HOLD_MINUTES_ENV = "ACROPORA_CART_HOLD_MINUTES"
export const CART_HOLD_MAX_PER_CART_ENV = "ACROPORA_CART_HOLD_MAX_PER_CART"
export const CART_HOLD_MAX_TOTAL_ENV = "ACROPORA_CART_HOLD_MAX_TOTAL"

/** polip's proposal (the plan, question 1). */
export const DEFAULT_HOLD_MINUTES = 30
/** The plan's proposal. */
export const DEFAULT_MAX_PER_CART = 5
/**
 * THE SHOP'S CEILING ON STANDING HOLDS (barracuda's review of #706): the Store API can be called past the storefront
 * with the public key, so neither the per-cart limit nor the storefront's per-visitor limit stops a script opening
 * carts. A per-address limit cannot live here: the hook has no request, and the shop sees every storefront buyer
 * from the storefront's address. So the shop counts all standing holds, and past the ceiling a unique piece goes into
 * the cart WITHOUT a hold (it is not refused): a script can tie up at most this many pieces, and nobody is kept from
 * buying. Six full carts' worth by default.
 */
export const DEFAULT_MAX_TOTAL = 30

export const cartHoldOn = (env: NodeJS.ProcessEnv = process.env): boolean => env[CART_HOLD_ENV]?.trim() === "on"

/** A whole number within the bounds, or the default: a broken value never makes a hold of zero or of a day. */
const boundedInteger = (raw: string | undefined, min: number, max: number, fallback: number): number => {
  const value = Number(raw?.trim())
  return raw?.trim() && Number.isInteger(value) && value >= min && value <= max ? value : fallback
}

export const holdMinutes = (env: NodeJS.ProcessEnv = process.env): number =>
  boundedInteger(env[CART_HOLD_MINUTES_ENV], 5, 240, DEFAULT_HOLD_MINUTES)

export const maxHoldsPerCart = (env: NodeJS.ProcessEnv = process.env): number =>
  boundedInteger(env[CART_HOLD_MAX_PER_CART_ENV], 1, 50, DEFAULT_MAX_PER_CART)

export const maxHoldsTotal = (env: NodeJS.ProcessEnv = process.env): number =>
  boundedInteger(env[CART_HOLD_MAX_TOTAL_ENV], 1, 1000, DEFAULT_MAX_TOTAL)

/**
 * The codes in a refusal's message, the way `unique_piece_sold` travels (sold-lines.ts): the message is what reaches
 * the browser, after the code and a colon.
 *   unique_piece_held:[{title, handle, until}]   the piece is in another cart until `until` (ISO time)
 *   cart_hold_limit:{max}                        this cart already holds `max` unique pieces
 */
export const HELD_CODE = "unique_piece_held"
export const LIMIT_CODE = "cart_hold_limit"
/**
 *   unique_piece_busy:[{title, handle}]          the piece's lock stayed taken through a wait and one retry: another
 *                                                buyer is adding it right now (S2, barracuda's review of #703). Not
 *                                                "sold" and not "held": the buyer may simply try again.
 */
export const BUSY_CODE = "unique_piece_busy"

export type HeldLine = { title: string; handle: string | null; until: string }
export type BusyLine = { title: string; handle: string | null }

export const heldMessage = (lines: readonly HeldLine[]): string => `${HELD_CODE}:${JSON.stringify(lines)}`
export const limitMessage = (max: number): string => `${LIMIT_CODE}:${JSON.stringify({ max })}`
export const busyMessage = (lines: readonly BusyLine[]): string => `${BUSY_CODE}:${JSON.stringify(lines)}`

export type HoldRow = { id: string; cart_id: string; expires_at: Date | string; updated_at?: Date | string | null }

export const expiresAtOf = (row: Pick<HoldRow, "expires_at">): Date => new Date(row.expires_at)

/** Live by time only; whether the holder still has the piece is the caller's second question. */
export const liveByTime = (row: Pick<HoldRow, "expires_at">, now: Date): boolean =>
  expiresAtOf(row).getTime() > now.getTime()

/**
 * A hold made this long ago may not have its line in the cart yet: Medusa adds the line AFTER the hook that made the
 * hold, and a call adding several pieces makes all of its holds before any line exists.
 */
export const IN_FLIGHT_MS = 60 * 1000

/**
 * DOES THIS HOLD STILL STAND? Live by time, and either its cart still has the piece on an open cart, or the hold is
 * so new that the line may still be on its way. A removed line or a placed order leaves a dead hold behind; without
 * the in-flight half, a second buyer arriving between the first one's hold and line would take the piece over, and
 * ten pieces added in one call would each see an empty count against the limit.
 */
export const holdStands = (row: HoldRow, now: Date, cartHasPiece: boolean): boolean => {
  if (!liveByTime(row, now)) return false
  if (cartHasPiece) return true
  const made = row.updated_at ? new Date(row.updated_at).getTime() : NaN
  return Number.isFinite(made) && now.getTime() - made < IN_FLIGHT_MS
}

export type HoldDecision =
  /** No row for this piece yet. */
  | { action: "create"; expires_at: Date }
  /** This cart's own live hold: nothing changes, the end stays where it was. */
  | { action: "keep"; expires_at: Date }
  /** The row is this cart's but dead, or another cart's and no longer standing: it becomes this cart's, from now. */
  | { action: "take"; id: string; expires_at: Date }
  /** Another cart's hold stands. */
  | { action: "refuse_held"; until: Date }
  /** A new hold would be one more than the cart may have. */
  | { action: "refuse_limit"; max: number }
  /** The shop's ceiling is reached: the line goes in without a hold (not refused). */
  | { action: "no_hold"; max: number }

/**
 * THE DECISION FOR ONE PIECE PUT IN ONE CART.
 *
 *   row                  the piece's hold row, if there is one
 *   holder               the cart asking (a pickup half asks as its parent)
 *   otherCartHasPiece    when the row is another cart's: does that cart still have the piece on an open cart?
 *   standingOwnHolds     how many of the holder's OTHER holds stand (`holdStands`): the limit counts only those, so a
 *                        buyer who removed a piece is not charged for it
 *   standingTotal        how many holds stand in the whole shop, this piece's own row left out; with `maxTotal`, the
 *                        shop's ceiling (both optional: without them there is no ceiling, as before)
 */
export function decideHold(input: {
  row: HoldRow | null
  holder: string
  now: Date
  minutes: number
  max: number
  otherCartHasPiece: boolean
  standingOwnHolds: number
  standingTotal?: number
  maxTotal?: number
}): HoldDecision {
  const { row, holder, now } = input
  if (row && row.cart_id !== holder && holdStands(row, now, input.otherCartHasPiece))
    return { action: "refuse_held", until: expiresAtOf(row) }
  if (row && row.cart_id === holder && liveByTime(row, now)) return { action: "keep", expires_at: expiresAtOf(row) }
  if (input.standingOwnHolds >= input.max) return { action: "refuse_limit", max: input.max }
  if (input.maxTotal !== undefined && (input.standingTotal ?? 0) >= input.maxTotal)
    return { action: "no_hold", max: input.maxTotal }
  const expires_at = new Date(now.getTime() + input.minutes * 60 * 1000)
  return row ? { action: "take", id: row.id, expires_at } : { action: "create", expires_at }
}

/**
 * IS THIS HOLD IN THE WAY OF `holder` PLACING AN ORDER? Another cart's, and it stands. The holder's own hold, live or
 * dead, never is (the plan: "A saját vagy lejárt foglalás nem akadály").
 */
export const holdBlocks = (row: HoldRow, holder: string, now: Date, otherCartHasPiece: boolean): boolean =>
  row.cart_id !== holder && holdStands(row, now, otherCartHasPiece)
