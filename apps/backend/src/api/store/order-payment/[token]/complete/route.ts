import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requirePaymentLinkConfig } from "../../../../../workflows/utils/order-payment/link-config"
import { payByLinkOperations } from "../../../../../workflows/utils/order-payment/operations"
import { completeLinkPayment } from "../../../../../workflows/utils/order-payment/pay-by-link"

/**
 * After the card was confirmed on the page: authorized, captured, paid.
 * `{ state: "paid", paid_at }`; safe to call again.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { secret } = requirePaymentLinkConfig()
  res.json(await completeLinkPayment(req.params.token, payByLinkOperations(req.scope), secret))
}
