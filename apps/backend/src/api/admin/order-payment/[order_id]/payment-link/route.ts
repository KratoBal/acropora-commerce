import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requirePaymentLinkConfig } from "../../../../../workflows/utils/order-payment/link-config"
import { paymentLinkOperations } from "../../../../../workflows/utils/order-payment/operations"
import { sendPaymentLink } from "../../../../../workflows/utils/order-payment/payment-link"
import { notifyPaymentLink, type PaymentNotification } from "../../../../../workflows/utils/webshop-mail/payment-notify"
import type { AdminSendOrderPaymentLinkType } from "../../validators"

/**
 * "FIZETÉSI LINK KÜLDÉSE" (brief, point 4): a signed link to the order's own
 * payment page, for what it owes now, and the customer's mail with it. A
 * refusal (still held, paid, expired, not a card order) is a 409 in Hungarian.
 * Sending again makes a new link with a new deadline; the old one stops
 * paying.
 */
export const POST = async (req: MedusaRequest<AdminSendOrderPaymentLinkType>, res: MedusaResponse) => {
  const { order_id } = req.params
  const { notify_customer } = req.validatedBody
  const config = requirePaymentLinkConfig()

  const sent = await sendPaymentLink(order_id, paymentLinkOperations(req.scope), config)

  const [shipped, pickup] = sent.orders
  let notification: PaymentNotification = { sent: false, reason: "not_requested" }
  if (notify_customer !== false) {
    notification = await notifyPaymentLink(req.scope, {
      orderId: shipped.order_id,
      pickupOrderId: pickup?.order_id ?? null,
      sentAt: sent.sent_at,
      url: sent.link.url,
      expiresAt: sent.link.expires_at,
      amount: sent.link.amount,
    })
  }

  res.json({ state: sent.state, link: sent.link, notification, orders: sent.orders })
}
