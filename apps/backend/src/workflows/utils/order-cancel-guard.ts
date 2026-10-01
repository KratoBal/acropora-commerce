import { stripeShareFactsOf } from "../../modules/stripe-capture/share"

/**
 * AN ORDER IS CANCELED ONLY ONCE ITS CAPTURED MONEY IS BACK (acrobot 25694 and
 * 25696, stage #25).
 *
 * Medusa's `cancelOrderWorkflow` refunds the captured payments in
 * `refundPaymentsStep` (core-flows 2.20.1, `payment/steps/refund-payments.js:16`),
 * and that step CATCHES a failed refund, logs it, and goes on: on stage #25 was
 * canceled with HTTP 200, Stripe refused the refund, and the customer's money
 * stayed with us, visible only in the log. That step is Medusa's, so it is not
 * changed; the cancel route is guarded before it instead:
 *
 *   1. the order must be cancelable (Medusa's own conditions, checked first, so
 *      no money moves for a cancel that would then be refused);
 *   2. a mixed cart's SHIPPED order is not canceled while its card hold still
 *      carries the pickup order's part (decision 4a, acrobot 25696): canceling
 *      it would cancel the shared intent, and the animal's money with it;
 *   3. every captured payment's outstanding amount is refunded HERE, with the
 *      module call that throws: if one fails, the cancel does not run, and the
 *      operator sees why. Medusa's own refund then finds nothing left to refund.
 *
 * Nothing here moves money on its own beyond what the cancel would have
 * refunded anyway.
 */
export type CancelPayment = {
  id: string
  /** Captured minus refunded, in the currency's units. */
  outstanding: number
  captured: number
  canceled: boolean
  data: Record<string, unknown> | null
}

export type CancelOrderFacts = {
  id: string
  status: string
  /** Fulfillments not canceled: Medusa refuses the cancel while there are any. */
  openFulfillments: number
  payments: CancelPayment[]
  /** For a mixed cart's shipped order: its pickup order's live (not canceled) payment, if any. */
  pickupPaymentLive: boolean
}

export type OrderCancelOperations = {
  load(orderId: string): Promise<CancelOrderFacts | null>
  refund(paymentId: string, amount: number): Promise<void>
}

export type OrderCancelResult =
  | { action: "pass"; refunded: { paymentId: string; amount: number }[] }
  | { action: "refuse"; message: string }

export const prepareOrderCancel = async (
  orderId: string,
  ops: OrderCancelOperations
): Promise<OrderCancelResult> => {
  const order = await ops.load(orderId)
  // an unknown order: Medusa answers it
  if (!order) return { action: "pass", refunded: [] }

  if (order.status === "canceled" || order.status === "completed" || order.openFulfillments > 0) {
    // Medusa refuses these itself; nothing is refunded first
    return { action: "pass", refunded: [] }
  }

  const heldForPickup = order.payments.some((payment) => {
    const share = stripeShareFactsOf(payment.data)
    return !!share && !share.joined && !payment.canceled && payment.captured === 0
  })
  if (heldForPickup && order.pickupPaymentLive) {
    return {
      action: "refuse",
      message:
        "Ez a rendelés egy vegyes kosár szállított része, és a kártyás zároláson a bolti (élő állatos) rendelés része is rajta van. Előbb a bolti rendelést töröld; utána ez a rendelés is törölhető.",
    }
  }

  const refunded: { paymentId: string; amount: number }[] = []
  for (const payment of order.payments) {
    if (payment.canceled || !(payment.outstanding > 0)) continue
    try {
      await ops.refund(payment.id, payment.outstanding)
      refunded.push({ paymentId: payment.id, amount: payment.outstanding })
    } catch (error) {
      return {
        action: "refuse",
        message: `A rendelés nincs törölve: a levont összeg visszatérítése nem sikerült (${(error as Error)?.message ?? error}).${
          refunded.length ? " Ami addig visszatérült, az visszatérült." : ""
        }`,
      }
    }
  }
  return { action: "pass", refunded }
}
