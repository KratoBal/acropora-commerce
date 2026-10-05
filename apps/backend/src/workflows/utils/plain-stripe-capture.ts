import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import { refuseWhileEditing } from "./order-edit-hold"
import { guardAdminCapture } from "./admin-capture-guard"
import { DIFFERENCE_UNPAID } from "./order-payment/state"
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

  if (!(owed > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A rendelés végösszege ${order.total} Ft, nincs mit levonni a kártyáról. Ha a rendelés üres, törölni kell, nem kiszállítani.`
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

  await ops.capture(payment.id, owed)
  return { captured: true, amount: owed }
}
