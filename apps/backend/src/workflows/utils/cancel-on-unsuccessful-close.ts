import { MedusaError } from "@medusajs/framework/utils"

import { prepareOrderCancel, type OrderCancelOperations } from "./order-cancel-guard"

/**
 * "SIKERTELENÜL LEZÁRT" CANCELS THE ORDER (card dfb79916; acrobot 60859, option A, measured on the test shop 2026-11-24).
 *
 * THE MEASURED GAP: the status was only a label. An order a customer had paid 400 points on went to "Sikertelenül lezárt"
 * and the balance stayed at 100; the points came back (500) only when the order was canceled through the shop's admin
 * (`POST /admin/orders/:id/cancel`), because the points and the gift card are given back by the subscribers of Medusa's
 * `order.canceled`, and nothing in the status change raised it.
 *
 * THE RULE: moving an order to `closed_unsuccessfully` cancels it first, through the same refund guard the admin cancel
 * runs (`prepareOrderCancel`: the captured money is refunded HERE, loudly, a mixed cart's shipped order waits for its
 * pickup order), then Medusa's own cancel (the card hold released, the reservation freed, `order.canceled` raised). That is
 * what gives the points and the gift card back, and it is the ONE place every way of closing goes through (the admin
 * button, the carrier, the payment deadline), so none can skip it.
 *
 * IT RUNS BEFORE THE STATUS CHANGES, and a refusal stops the move: a canceled order that still says "in progress" is a
 * wrong picture, but a "closed" order that kept the customer's money is the worse one, and the operator must see why.
 * The sentence is the refund guard's own. If the status step fails AFTER the cancel, the next try finds the order already
 * canceled and goes on to the status.
 *
 * THE ORDER MEDUSA CANNOT CANCEL (acrobot 60868: this is the MAIN case, a refused or uncollected parcel that came back, not a
 * rare one): Medusa refuses to cancel an order with a fulfillment that was not canceled, a shipped fulfillment cannot be
 * canceled at all, and a completed order cannot be canceled. The close must still go through (the returned parcel has to be
 * closeable), and the points and the gift card share are given back DIRECTLY, with the same ledger movements the
 * `order.canceled` subscribers make (`give-back-order-credits.ts`), keyed so that a later real cancel gives nothing back twice.
 * What this does NOT do for such an order: refund a captured card payment or free anything in Medusa; that stays a hand job
 * (a returned cash-on-delivery parcel has no captured payment at all).
 *
 * AN ORDER THAT IS ALREADY CANCELED goes on to the status with nothing done (a repeat, or the admin got there first).
 */
export const CANCEL_ON_STATUS = "closed_unsuccessfully"

export type CancelOnCloseOperations = OrderCancelOperations & {
  /** Medusa's own cancel (it raises `order.canceled`). */
  cancel(orderId: string): Promise<void>
  /** The points and the gift card share, given back with the cancel subscribers' ledger movements (idempotent, never throws). */
  giveBackCredits(orderId: string): Promise<void>
}

export type CancelOnCloseResult =
  | { action: "other_status" }
  | { action: "unknown_order" }
  | { action: "already_canceled" }
  | { action: "credits_given_back"; reason: "completed" | "open_fulfillments" }
  | { action: "canceled"; refunded: { paymentId: string; amount: number }[] }

export const cancelOnUnsuccessfulClose = async (
  input: { order_id: string; to: string },
  ops: CancelOnCloseOperations,
  assertAllowed: () => Promise<void>
): Promise<CancelOnCloseResult> => {
  if (input.to !== CANCEL_ON_STATUS) return { action: "other_status" }
  // the transition rules first: no cancel (and no refund) for a move the status table refuses
  await assertAllowed()

  const facts = await ops.load(input.order_id)
  // an unknown order: the status step answers it
  if (!facts) return { action: "unknown_order" }
  if (facts.status === "canceled") return { action: "already_canceled" }
  const cannotCancel: "completed" | "open_fulfillments" | null =
    facts.status === "completed" ? "completed" : facts.openFulfillments > 0 ? "open_fulfillments" : null
  if (cannotCancel) {
    await ops.giveBackCredits(input.order_id)
    return { action: "credits_given_back", reason: cannotCancel }
  }

  const prepared = await prepareOrderCancel(input.order_id, ops)
  if (prepared.action === "refuse") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, prepared.message)

  try {
    await ops.cancel(input.order_id)
  } catch (error) {
    const refunded = prepared.refunded.reduce((total, row) => total + row.amount, 0)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A rendelés nincs lemondva, ezért nem is zárható le sikertelenül: ${(error as Error)?.message ?? error}.${
        refunded > 0 ? ` Ami addig visszatérült (${refunded}), az visszatérült.` : ""
      }`
    )
  }
  return { action: "canceled", refunded: prepared.refunded }
}
