import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { releaseHoldOperations } from "../../../../../workflows/utils/order-payment/operations"
import { releaseHold } from "../../../../../workflows/utils/order-payment/release-hold"
import { notifyHoldReleased, type PaymentNotification } from "../../../../../workflows/utils/webshop-mail/payment-notify"
import { answerRefusal } from "../../refusal"
import type { AdminReleaseOrderPaymentHoldType } from "../../validators"

/**
 * "CSÚSZIK A SZÁLLÍTÁS" (brief, point 3): the Stripe hold released, the order
 * (and a mixed cart's pair with it) waiting for payment, and the customer's
 * mail. A refusal (captured already, no card hold, an edit running) is a 409
 * with the reason in Hungarian; pressing it again after a release is not an
 * error, and only sends a mail that did not go the first time.
 *
 * THE MAIL GOES AFTER THE RELEASE, NOT INSIDE IT, as with a status change: a
 * mail that could not go does not bring the hold back.
 */
export const POST = async (req: MedusaRequest<AdminReleaseOrderPaymentHoldType>, res: MedusaResponse) => {
  const { order_id } = req.params
  const { notify_customer } = req.validatedBody

  let result: Awaited<ReturnType<typeof releaseHold>>
  try {
    result = await releaseHold(order_id, releaseHoldOperations(req.scope))
  } catch (error) {
    if (answerRefusal(res, error)) return
    throw error
  }

  const [shipped, pickup] = result.orders
  let notification: PaymentNotification = { sent: false, reason: "not_requested" }
  if (notify_customer !== false) {
    notification = await notifyHoldReleased(req.scope, {
      orderId: shipped.order_id,
      releasedAt: result.released_at,
      amount: result.amount,
      pickupDisplayId: pickup?.display_id ?? null,
    })
  }

  res.json({
    state: result.state,
    notification,
    released: result.released,
    amount: result.amount,
    orders: result.orders,
  })
}
