import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { readSimplePayIpn, simplePayIpnAnswer } from "../../../modules/simplepay/ipn"
import SimplePayProviderService from "../../../modules/simplepay/service"
import { finishSimplePayOrder } from "../../../workflows/utils/simplepay-finish"

/**
 * POST /simplepay/ipn: SimplePay's instant payment notification (P4-3b).
 *
 * The URL is set in the SimplePay admin, not in the start request (L1147);
 * it must be public, without any protection in front (L1154-1156). The body
 * is kept raw (`preserveRawBody` in middlewares.ts): the signature covers the
 * exact bytes.
 *
 * On FINISHED the order is made (`finishSimplePayOrder`). If that fails, the
 * answer is an error, so SimplePay retries (L1157-1174) instead of believing
 * we are done. Every other status is only acknowledged: nothing to fulfil.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = SimplePayProviderService.configOf({
    merchant: process.env.SIMPLEPAY_MERCHANT,
    secretKey: process.env.SIMPLEPAY_SECRET_KEY,
    sandbox: process.env.SIMPLEPAY_SANDBOX,
  })
  const signature = req.headers["signature"]
  const reading = readSimplePayIpn(
    (req as unknown as { rawBody?: Buffer }).rawBody,
    Array.isArray(signature) ? signature[0] : signature,
    config
  )

  if (!reading.ok) {
    res.status(reading.status).json({ message: reading.message })
    return
  }

  if (reading.ipn.status === "FINISHED") {
    try {
      await finishSimplePayOrder(req.scope, reading.ipn)
    } catch (error) {
      req.scope
        .resolve(ContainerRegistrationKeys.LOGGER)
        .error(
          `SimplePay IPN ${reading.ipn.orderRef} (${reading.ipn.transactionId}): the order was not made, SimplePay will retry: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      res.status(500).json({ message: "The order could not be made yet" })
      return
    }
  }

  const answer = simplePayIpnAnswer(reading.ipn, config!.secretKey)
  res.setHeader("Content-Type", "application/json")
  res.setHeader("Signature", answer.signature)
  res.status(200).send(answer.body)
}
