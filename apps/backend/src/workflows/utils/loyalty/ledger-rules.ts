import { MedusaError } from "@medusajs/framework/utils"

import { sumPoints } from "../../../modules/loyalty/balance"
import type { LoyaltyEntryRow, NewLoyaltyEntry } from "../../../modules/loyalty/service"

/**
 * THE REDEMPTION RULES OF THE POINTS LEDGER, over an injected transaction, so they are measured without a database
 * (the module binds them to its transaction: `LoyaltyModuleService.redeemPoints` and the two below). Same shape as the
 * gift card's redeem, void and refund, with the ledger's difference: there is no balance column, the balance is the sum
 * of the customer's rows, so "taking" is a negative row and "giving back" is either deleting that row (a completion that
 * rolled back) or a positive row (an order that was cancelled).
 *
 * THE KEYS. A redemption's reference is `redeem:<cart>`; a cancellation's is `reverse:<cart>`. The unique index on the
 * reference (live rows only) is the referee: the same cart redeems once, and a repeated completion or event stores
 * nothing twice.
 */
export type LedgerTx = {
  /** Serializes one customer's movements for the rest of the transaction (an advisory lock: there is no balance row). */
  lock(customerId: string): Promise<void>
  /** The customer's live rows. */
  rows(customerId: string): Promise<LoyaltyEntryRow[]>
  byReference(reference: string): Promise<LoyaltyEntryRow | null>
  create(input: NewLoyaltyEntry): Promise<LoyaltyEntryRow>
  /** Soft-deletes a row: it stops counting, and its reference is free again. */
  remove(id: string): Promise<void>
}

export const redeemReference = (cartId: string) => `redeem:${cartId}`
export const reverseReference = (cartId: string) => `reverse:${cartId}`
export const accrueReference = (orderId: string) => `accrue:${orderId}`

const wholePositive = (points: number) => {
  if (!Number.isInteger(points) || points < 1)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A pontszám pozitív egész szám kell legyen.")
}

/**
 * TAKES THE POINTS when the cart becomes an order. Refused (the customer's message) when the balance does not cover it.
 * An earlier redemption of the same cart with the same points is a repeat: nothing is taken again. One with OTHER points
 * (a completion that took X died before its compensation, and the cart's credit was capped to Y since) is given back
 * under the lock, then Y is taken: the order carries Y, so Y must be what left the balance. Not once a reversal exists:
 * that order was cancelled.
 */
export async function redeemRule(
  tx: LedgerTx,
  input: { customer_id: string; points: number; cart_id: string },
): Promise<{ balance: number; repeated: boolean }> {
  wholePositive(input.points)
  await tx.lock(input.customer_id)
  const key = redeemReference(input.cart_id)
  const earlier = await tx.byReference(key)
  if (earlier) {
    if (earlier.customer_id !== input.customer_id)
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Erre a kosárra más vevő pontjai már be lettek váltva.")
    if (-earlier.points === input.points) return { balance: sumPoints(await tx.rows(input.customer_id)), repeated: true }
    if (await tx.byReference(reverseReference(input.cart_id)))
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Erre a kosárra már volt visszavont beváltás, más pontszámmal nem váltható be újra.",
      )
    await tx.remove(earlier.id)
  }
  const balance = sumPoints(await tx.rows(input.customer_id))
  if (balance < input.points)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Nincs elég hűségpontod ehhez a beváltáshoz.")
  await tx.create({
    customer_id: input.customer_id,
    kind: "redemption",
    points: -input.points,
    reference: key,
    reason: `Beváltás a kosárban (${input.cart_id})`,
    actor: "system",
  })
  return { balance: balance - input.points, repeated: false }
}

/**
 * UNDOES A REDEMPTION whose cart completion was rolled back: the row is soft-deleted, so the points count again and a
 * retry of the same cart can redeem again (a negative-then-positive pair would leave the key taken). Nothing to undo is a
 * no-op; a redemption an order was cancelled against is not undone (that order exists).
 */
export async function voidRule(
  tx: LedgerTx,
  input: { customer_id: string; cart_id: string },
): Promise<{ balance: number | null; voided: boolean }> {
  await tx.lock(input.customer_id)
  const earlier = await tx.byReference(redeemReference(input.cart_id))
  if (!earlier || earlier.customer_id !== input.customer_id) return { balance: null, voided: false }
  if (await tx.byReference(reverseReference(input.cart_id)))
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Ez a beváltás már visszavonva (a rendelés le lett mondva).")
  await tx.remove(earlier.id)
  return { balance: sumPoints(await tx.rows(input.customer_id)), voided: true }
}

/**
 * A CANCELLED ORDER GIVES ITS POINTS BACK: one positive row, all of what the cart's redemption took, once (the key is the
 * cart, so a repeated event stores nothing). `order_id` names the order in the history. A cart that was never redeemed
 * has nothing to give back.
 */
export async function reverseRule(
  tx: LedgerTx,
  input: { customer_id: string; cart_id: string; order_id: string },
): Promise<{ balance: number; points: number; repeated: boolean }> {
  await tx.lock(input.customer_id)
  const redeemed = await tx.byReference(redeemReference(input.cart_id))
  if (!redeemed || redeemed.customer_id !== input.customer_id)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Erről a kosárról ennek a vevőnek nem volt beváltás, nincs mit visszaadni.",
    )
  const key = reverseReference(input.cart_id)
  const done = await tx.byReference(key)
  const points = -redeemed.points
  if (done) return { balance: sumPoints(await tx.rows(input.customer_id)), points, repeated: true }
  await tx.create({
    customer_id: input.customer_id,
    kind: "reversal",
    points,
    order_id: input.order_id,
    reference: key,
    reason: `A rendelés (${input.order_id}) le lett mondva: a beváltott pontok visszajárnak`,
    actor: "system",
  })
  return { balance: sumPoints(await tx.rows(input.customer_id)), points, repeated: false }
}

/**
 * THE POINTS AN ORDER EARNED, credited ONCE when the order is closed (card dfb79916). The key is the order (`accrue:<order>`),
 * so a repeated event, a second "closed" move or a retry stores nothing twice. A customer other than the one the first credit
 * named is refused: an order has one customer, and a mismatch is a data fault to see, not to overwrite.
 */
export async function accrueRule(
  tx: LedgerTx,
  input: { customer_id: string; order_id: string; points: number },
): Promise<{ balance: number; points: number; repeated: boolean }> {
  wholePositive(input.points)
  await tx.lock(input.customer_id)
  const key = accrueReference(input.order_id)
  const earlier = await tx.byReference(key)
  if (earlier) {
    if (earlier.customer_id !== input.customer_id)
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Erre a rendelésre más vevőnek már jóvá lettek írva a pontok.")
    return { balance: sumPoints(await tx.rows(input.customer_id)), points: earlier.points, repeated: true }
  }
  await tx.create({
    customer_id: input.customer_id,
    kind: "accrual",
    points: input.points,
    order_id: input.order_id,
    reference: key,
    reason: `Pontgyűjtés a lezárt rendelés után (${input.order_id})`,
    actor: "system",
  })
  return { balance: sumPoints(await tx.rows(input.customer_id)), points: input.points, repeated: false }
}
