import { STRIPE_PROVIDER_ID } from "./stripe-config"

/**
 * AN ADMIN CAPTURE OF A CARD PAYMENT TAKES THE ORDER'S CURRENT TOTAL, NOTHING
 * ELSE (acrobot 26265, measured on stage 2026-10-05, order #36).
 *
 * `POST /admin/payments/:id/capture {"amount": 10000}` on a 14 000 Ft order
 * captured 10 000 and Stripe released the other 4 000 for good. The order then
 * showed `payment_status=refunded` with `total=4000`: money that was never
 * taken, reading like money that was. The decision: not allowed.
 *
 * - The amount captured from the admin is the order's CURRENT total: the
 *   requested `amount`, or, when it is left out, what Medusa would take (the
 *   payment's amount).
 * - A SMALLER amount only through an order edit. The edit's confirm captures
 *   the new total itself (`captureBeforeOrderEdit`), through the payment
 *   module, not through this route; after a confirmed edit the order's total IS
 *   the smaller amount, so a capture from here matches it again.
 * - On a mixed cart each payment is measured against ITS OWN order: the
 *   shipped order's total for the shipped payment, the pickup order's for the
 *   pickup one (the parts recorded on the shared intent). The shared capture
 *   at "Kiszállítás" (`captureSharedStripePayment`) also goes through the
 *   payment module, and never reaches this guard.
 *
 * What passes untouched: another provider (cash on delivery, pay at store),
 * an unknown payment (Medusa answers 404 itself), and a payment already
 * captured (the provider refuses a second capture with its own message).
 */
export type AdminCaptureFacts = {
  provider_id: string | null
  /** The payment's amount, in the currency's major unit (Ft). */
  amount: number
  /** What is already captured on it. */
  captured: number
  /** The payment's order, with its current total; null if none is linked. */
  order: { id: string; total: number } | null
}

export type AdminCaptureOperations = {
  load(paymentId: string): Promise<AdminCaptureFacts | null>
}

export type AdminCaptureResult =
  | { action: "pass" }
  | { action: "refuse"; message: string }

const sameAmount = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100)

export const guardAdminCapture = async (
  paymentId: string,
  /** The `amount` of the request; undefined when it was left out. */
  requested: number | undefined,
  ops: AdminCaptureOperations
): Promise<AdminCaptureResult> => {
  const facts = await ops.load(paymentId)

  if (!facts || facts.provider_id !== STRIPE_PROVIDER_ID || facts.captured > 0) {
    return { action: "pass" }
  }

  if (!facts.order) {
    return {
      action: "refuse",
      message:
        "A kártyás fizetéshez nem található rendelés, ezért nem tudható, mennyit szabad levonni. A levonás nem történt meg.",
    }
  }

  const amount = requested ?? facts.amount
  const total = facts.order.total

  if (sameAmount(amount, total)) {
    return { action: "pass" }
  }

  if (amount < total) {
    return {
      action: "refuse",
      message: `Kisebb összeget nem lehet levonni: a kártyás fizetésből csak a rendelés aktuális végösszege (${total} Ft) vonható le. Ha egy tétel kimarad, szerkeszd a rendelést (Szerkesztés, a tétel törlése vagy módosítása, majd megerősítés): a megerősítés az új végösszeget vonja le, egyszer. A kártyán maradó összeg ezután felszabadul.`,
    }
  }

  return {
    action: "refuse",
    message: `Többet nem lehet levonni, mint a rendelés aktuális végösszege (${total} Ft). Ha a rendelés többe kerül, mint amennyit a kártyán zároltunk, a többletet külön fizetéssel kell rendezni.`,
  }
}
