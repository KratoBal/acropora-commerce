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
 * WHAT IT LEAVES ALONE, and says so (the result names it): an order that is already canceled (a repeat, or the admin got
 * there first), a completed order, and an order with a fulfillment that was not canceled (a parcel was shipped: Medusa
 * refuses to cancel those itself, and a delivery that failed must still be closeable). For those the move goes on as it
 * always did and the points are NOT given back; that stays a hand job until the parcel's fulfillment is canceled.
 */
export const CANCEL_ON_STATUS = "closed_unsuccessfully"

export type CancelOnCloseOperations = OrderCancelOperations & {
  /** Medusa's own cancel (it raises `order.canceled`). */
  cancel(orderId: string): Promise<void>
}

export type CancelOnCloseResult =
  | { action: "other_status" }
  | { action: "unknown_order" }
  | { action: "already_canceled" }
  | { action: "left_open"; reason: "completed" | "open_fulfillments" }
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
  if (facts.status === "completed") return { action: "left_open", reason: "completed" }
  if (facts.openFulfillments > 0) return { action: "left_open", reason: "open_fulfillments" }

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
