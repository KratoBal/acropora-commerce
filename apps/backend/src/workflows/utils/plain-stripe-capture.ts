import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import { refuseWhileEditing } from "./order-edit-hold"
import { guardAdminCapture } from "./admin-capture-guard"
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

  if (!(order.total > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A rendelés végösszege ${order.total} Ft, nincs mit levonni a kártyáról. Ha a rendelés üres, törölni kell, nem kiszállítani.`
    )
  }

  // the guard compares with the order's total; the hold is a separate bound
  if (order.total > payment.amount) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A rendelés végösszege (${order.total} Ft) több, mint a kártyán zárolt összeg (${payment.amount} Ft): a többletet külön fizetéssel kell rendezni. A levonás nem történt meg.`
    )
  }

  const verdict = await guardAdminCapture(payment.id, order.total, {
    load: async () => ({
      provider_id: payment.provider_id ?? null,
      amount: payment.amount,
      captured: payment.captured,
      order: { id: order.order_id, total: order.total },
    }),
  })
  if (verdict.action === "refuse") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, verdict.message)
  }

  await ops.capture(payment.id, order.total)
  return { captured: true, amount: order.total }
}
