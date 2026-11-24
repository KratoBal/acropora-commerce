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
 *
 * THE CLOSE IS NOT REVERSIBLE ONCE SOMETHING MOVED (barracuda 60883, acrobot 60885): the status table lets `closed_unsuccessfully`
 * go back to `stocking`, and a reopened order whose cancel freed the stock, refunded the money and gave the points and the card
 * back would be a canceled order shipping again, earning points on closing. So the reopening is refused by the server
 * (`refuseReopenAfterMovement`) when the order is canceled, or when the close gave points or the card back (a marker on the
 * order says so). An order the close moved nothing on (an old label-only close, or no points, card or cancelable order) can
 * still be reopened, as before. The sentence tells the operator what to do: a new order.
 */
export const CANCEL_ON_STATUS = "closed_unsuccessfully"
/** The order metadata key the close leaves when it gave credits back (the reopening checks it). */
export const GIVEN_BACK_METADATA_KEY = "unsuccessful_close_credits_given_back"

export type CancelOnCloseOperations = OrderCancelOperations & {
  /** Medusa's own cancel (it raises `order.canceled`). */
  cancel(orderId: string): Promise<void>
  /** The points and the gift card share, given back with the cancel subscribers' ledger movements (idempotent, never throws); how many credit lines are now given back. */
  giveBackCredits(orderId: string): Promise<number>
  /** Marks the order: the close gave credits back (the reopening checks it), and how much captured card money stays a hand refund. */
  markGivenBack(orderId: string, trace: GivenBackTrace): Promise<void>
}

/** What the close leaves on the order, so the reopening can be refused and the hand refund can be found. */
export type GivenBackTrace = {
  credit_lines: number
  /** captured card money NOT refunded by this path (a hand job); 0 when there was none */
  captured_unrefunded: number
}

export type CancelOnCloseResult =
  | { action: "other_status" }
  | { action: "unknown_order" }
  | { action: "already_canceled" }
  | {
      action: "credits_given_back"
      reason: "completed" | "open_fulfillments"
      credit_lines: number
      captured_unrefunded: number
    }
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
    const creditLines = await ops.giveBackCredits(input.order_id)
    const capturedUnrefunded = facts.payments.reduce(
      (total, payment) => total + (payment.canceled || !(payment.outstanding > 0) ? 0 : payment.outstanding),
      0
    )
    // only when something moved: an order the close moved nothing on stays reopenable, as before
    if (creditLines > 0) await ops.markGivenBack(input.order_id, { credit_lines: creditLines, captured_unrefunded: capturedUnrefunded })
    return { action: "credits_given_back", reason: cannotCancel, credit_lines: creditLines, captured_unrefunded: capturedUnrefunded }
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

/**
 * THE REOPENING IS REFUSED WHEN THE UNSUCCESSFUL CLOSE MOVED SOMETHING (see the header). Only the move out of
 * `closed_unsuccessfully` (the status table allows one: `stocking`) is looked at; every other move passes untouched.
 */
export const REOPEN_FROM_STATUS = "closed_unsuccessfully"
export const REOPEN_TO_STATUS = "stocking"

export type ReopenOperations = {
  /** The order's business status right now, or null if it has none. */
  currentStatus(orderId: string): Promise<string | null>
  /** Medusa's order status (`canceled`, ...), or null if the order is unknown. */
  orderStatus(orderId: string): Promise<string | null>
  /** The close gave credits back on this order (the marker `markGivenBack` leaves). */
  givenBackMarker(orderId: string): Promise<boolean>
}

export const refuseReopenAfterMovement = async (input: { order_id: string; to: string }, ops: ReopenOperations): Promise<void> => {
  if (input.to !== REOPEN_TO_STATUS) return
  if ((await ops.currentStatus(input.order_id)) !== REOPEN_FROM_STATUS) return
  if ((await ops.orderStatus(input.order_id)) === "canceled")
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Ez a rendelés a sikertelen lezáráskor le lett mondva (a foglalás felszabadult, a befizetett összeg visszatérült, a pont és az ajándékkártya visszajárt), ezért nem nyitható újra. Újraküldéshez új rendelés kell."
    )
  if (await ops.givenBackMarker(input.order_id))
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Ennél a rendelésnél a sikertelen lezáráskor a pont és az ajándékkártya visszajárt, ezért nem nyitható újra. Újraküldéshez új rendelés kell."
    )
}

/**
 * THE SAME CHECK, AS A SENTENCE OR NOTHING: the admin read asks it to stop OFFERING "Készletezés" on an order the server would refuse to
 * reopen (the OS lists the next steps from the status table, which still has the way back, so it offered a step that always answered 422).
 * `null`: the reopening is allowed (or not a reopening at all). Only a refusal is caught; any other error propagates.
 */
export const reopenRefusalOf = async (orderId: string, ops: ReopenOperations): Promise<string | null> => {
  try {
    await refuseReopenAfterMovement({ order_id: orderId, to: REOPEN_TO_STATUS }, ops)
    return null
  } catch (error) {
    if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_ALLOWED) return error.message
    throw error
  }
}
