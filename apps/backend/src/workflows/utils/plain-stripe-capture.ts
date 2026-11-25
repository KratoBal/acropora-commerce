import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import { refuseWhileEditing } from "./order-edit-hold"
import { guardAdminCapture } from "./admin-capture-guard"
import { DIFFERENCE_UNPAID, differenceOverpaid } from "./order-payment/state"
import type { SharedCaptureOperations } from "./shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "./stripe-config"

/**
 * WHAT A FAILED CAPTURE TELLS THE OPERATOR (card 23ebb2a2; barracuda 61127, BLOCKING in the first version). `ops.capture` is Medusa's capture:
 * the provider (Stripe) captures first, then Medusa books it. An error AFTER Stripe's success (a timeout on the answer, a failed database write,
 * a retried call) leaves the customer's card ALREADY CHARGED, so a sentence that says "the money did not come off, send a payment link" would
 * make the operator ask for the money twice. So the advice is given ONLY for the two causes the error text names unmistakably:
 *
 *   an expired hold          (`charge_expired_for_capture`, "has already expired", "expired for capture") -> a payment link
 *   a declined card          (`card_declined`, "was declined")                                          -> another card
 *
 * and for EVERYTHING ELSE the sentence says the truth: we do not know whether the amount came off, look at the payment in Stripe (named by its
 * PaymentIntent) BEFORE asking for money again. The provider's words stay in every case, as one short line (line breaks collapsed, at most 200
 * characters). THE HEAD IS NEUTRAL ("hibát jelzett"): "the levonás nem történt meg" stands only in the two known branches, where it is true
 * (barracuda 61130). The status did not change in any of them (the capture runs before the status step).
 */
export const captureRefusalSentence = (input: { owed: number; reason: string; paymentIntentId: string | null }): string => {
  const reason = input.reason.replace(/\s+/g, " ").trim().slice(0, 200)
  const head = `A kártyás levonás (${input.owed} Ft) hibát jelzett, a rendelés állapota nem változott. A szolgáltató válasza: ${reason || "nincs"}.`
  if (/charge_expired_for_capture|has already expired|expired for capture/i.test(input.reason))
    return `${head} A zárolás lejárt, a levonás nem történt meg: küldj a rendelés oldalán fizetési linket.`
  if (/card_declined|was declined/i.test(input.reason))
    return `${head} A kártyát elutasították, a levonás nem történt meg: kérd a vevőt, hogy másik kártyával fizessen.`
  return `${head} Nem tudjuk, hogy az összeg a vevő kártyájáról lejött-e (a hiba a szolgáltató sikere UTÁN is jöhetett): nézd meg a Stripe-ban a fizetést${
    input.paymentIntentId ? ` (${input.paymentIntentId})` : ""
  }, MIELŐTT újra pénzt kérnél vagy fizetési linket küldenél.`
}

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
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      captureRefusalSentence({
        owed,
        reason: error instanceof Error ? error.message : String(error),
        paymentIntentId: typeof payment.data?.id === "string" ? payment.data.id : null,
      })
    )
  }
  return { captured: true, amount: owed }
}
