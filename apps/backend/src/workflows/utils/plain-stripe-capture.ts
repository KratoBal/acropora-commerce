import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import { refuseWhileEditing } from "./order-edit-hold"
import { guardAdminCapture } from "./admin-capture-guard"
import { DIFFERENCE_UNPAID, differenceOverpaid } from "./order-payment/state"
import type { SharedCaptureOperations } from "./shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "./stripe-config"

export type PlainCaptureResult =
  | { captured: false; reason: "not_card" | "shared" | "already_captured" | "no_order" }
  | { captured: true; amount: number }

/**
 * "KISZÁLLÍTÁS" CAPTURES A PLAIN CARD PAYMENT TOO (C2; the prompt's point 8,
 * Balázs 2026-10-01): an order with its own Stripe payment (no `stripe_share`
 * on the payment, a plain cart since #475) is captured for its CURRENT total
 * when it goes `out_for_delivery`, before the status changes. Until now only
 * the mixed cart's shared payment was captured there, and a plain card order
 * left the shop with nothing taken.
 *
 * THE AMOUNT RULE IS THE ADMIN CAPTURE'S (`guardAdminCapture`, #467), not a
 * second one: the order's current total, never less (a dropped item goes
 * through an order edit, which lowers the total). The guard does not look at
 * the hold, so "never more than the hold" is checked here, before it.
 * A refusal throws, so the status does not change and the admin sees why.
 *
 * Passes without capturing: another provider (cash on delivery, pay at the
 * store), a payment already captured, and a share of a mixed cart (that one is
 * `captureSharedStripePayment`'s).
 */
export const capturePlainStripePayment = async (
  orderId: string,
  ops: SharedCaptureOperations
): Promise<PlainCaptureResult> => {
  const pair = await ops.loadPair(orderId)
  const order = pair?.shipped
  if (!order) return { captured: false, reason: "no_order" }

  const payment = order.payment
  if (!payment || payment.provider_id !== STRIPE_PROVIDER_ID) {
    return { captured: false, reason: "not_card" }
  }
  if (stripeShareFactsOf(payment.data)) return { captured: false, reason: "shared" }
  if (payment.captured > 0) return { captured: false, reason: "already_captured" }
  // an order edit's confirm is moving the collection: retry, take nothing
  refuseWhileEditing([order])

  /*
    WHAT THE HOLD OWES: the order's total, less a difference already paid
    through a link (plan section 5: an item added after the order, over the
    hold). Without such a payment it is the total, as before.
  */
  const owed = order.total - (order.other_captured ?? 0)

  // more paid as a difference than the order costs: a refund, named (card 04b6010e)
  if (owed < 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      differenceOverpaid(order.other_captured ?? 0, order.total)
    )
  }

  if (!(owed > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A rendelés végösszege ${order.total} Ft, nincs mit levonni a kártyáról. Ha a rendelés üres, törölni kell, nem kiszállítani és nem lezárni.`
    )
  }

  // the guard compares with what is owed; the hold is a separate bound
  if (owed > payment.amount) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, DIFFERENCE_UNPAID)
  }

  const verdict = await guardAdminCapture(payment.id, owed, {
    load: async () => ({
      provider_id: payment.provider_id ?? null,
      amount: payment.amount,
      captured: payment.captured,
      order: { id: order.order_id, total: owed },
    }),
  })
  if (verdict.action === "refuse") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, verdict.message)
  }

  try {
    await ops.capture(payment.id, owed)
  } catch (error) {
    /*
      THE PROVIDER'S ERROR IS NOT THE OPERATOR'S ANSWER (barracuda 61115; card 23ebb2a2). A hold that ran out or a card that was refused came
      back as the raw Stripe text; the operator needs the next step. The provider's words stay in the sentence (they say which of the two it
      was), the status did not change (this runs before it), and the ways on are the two this order has: a payment link, or the customer's
      other card. Both the close and Kiszállítás reach this.
    */
    const reason = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").trim().slice(0, 200)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A kártyáról nem sikerült levonni a ${owed} Ft-ot, a rendelés állapota nem változott. A szolgáltató válasza: ${reason || "nincs"}. Ha a zárolás lejárt, küldj a rendelés oldalán fizetési linket; ha a kártyát elutasították, kérd a vevőt, hogy másik kártyával fizessen.`
    )
  }
  return { captured: true, amount: owed }
}
