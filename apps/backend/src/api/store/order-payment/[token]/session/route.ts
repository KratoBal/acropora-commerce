import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requirePaymentLinkConfig } from "../../../../../workflows/utils/order-payment/link-config"
import { payByLinkOperations } from "../../../../../workflows/utils/order-payment/operations"
import { startLinkSession } from "../../../../../workflows/utils/order-payment/pay-by-link"

/** The Stripe payment the page confirms the card with: `{ client_secret, amount }`. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { secret } = requirePaymentLinkConfig()
  res.json(await startLinkSession(req.params.token, payByLinkOperations(req.scope), secret))
}
