import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { SimplePayClient } from "../../../../modules/simplepay/client"
import {
  SIMPLEPAY_PAID,
  SIMPLEPAY_UNPAID_FINAL,
  simplePayTransaction,
} from "../../../../modules/simplepay/query"
import SimplePayProviderService from "../../../../modules/simplepay/service"
import { readSimplePayBack } from "../../../../modules/simplepay/signature"
import { finishSimplePayOrder } from "../../../../workflows/utils/simplepay-finish"
import { rejoinAfterUnpaidSimplePay } from "../../../../workflows/utils/simplepay-rejoin"

/** For tests: a client with a fake transport. */
export const simplePayClientFactory = {
  create: (config: ConstructorParameters<typeof SimplePayClient>[0]) => new SimplePayClient(config),
}

/**
 * POST /store/simplepay/back: the customer came back from SimplePay (P4-3c3).
 *
 * The storefront's back page passes the `r` and `s` it received (section
 * 3.12). The event in `r` is not proof of anything (L1011-1012), so the
 * transaction is asked for by query, and that decides:
 *
 * - paid (FINISHED): the orders are made, the same way the IPN makes them. If
 *   that fails now, the IPN makes them later; the answer says `paid`.
 * - ended without payment, or still INIT while the customer came back with
 *   FAIL, CANCEL or TIMEOUT: a split waiting for its shared payment is put
 *   back together, so the customer finds the cart as they left it. Dropping
 *   the session releases the unpaid transaction.
 * - anything else: `pending`, nothing changes.
 *
 * The answer is for the page to choose its text (section 3.13, P4-4).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = SimplePayProviderService.configOf({
    merchant: process.env.SIMPLEPAY_MERCHANT,
    secretKey: process.env.SIMPLEPAY_SECRET_KEY,
    sandbox: process.env.SIMPLEPAY_SANDBOX,
  })

  if (!config) {
    res.status(503).json({ message: "SimplePay is not configured" })
    return
  }

  const { r, s } = (req.body ?? {}) as { r?: unknown; s?: unknown }

  if (typeof r !== "string" || typeof s !== "string" || !r || !s) {
    res.status(400).json({ message: "r and s are required" })
    return
  }

  const back = readSimplePayBack(r, s, config.secretKey)

  if (!back) {
    res.status(401).json({ message: "Invalid SimplePay signature" })
    return
  }
  if (back.m !== config.merchant || !back.o || !back.t) {
    res.status(400).json({ message: "Not a return from our SimplePay account" })
    return
  }

  const { status } = await simplePayTransaction(simplePayClientFactory.create(config), back.t)

  if (status && SIMPLEPAY_PAID.has(status)) {
    try {
      const made = await finishSimplePayOrder(req.scope, {
        orderRef: back.o,
        transactionId: back.t,
        merchant: back.m,
        status,
      })
      res.json({ event: back.e, status: "paid", order_ids: made.order_ids })
    } catch (error) {
      req.scope
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(
          `SimplePay return ${back.o} (${back.t}): paid, the order is left to the IPN: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      res.json({ event: back.e, status: "paid", order_ids: [] })
    }
    return
  }

  const cameBackUnpaid = back.e !== "SUCCESS" && status === "INIT"

  if ((status && SIMPLEPAY_UNPAID_FINAL.has(status)) || cameBackUnpaid) {
    const restored = await rejoinAfterUnpaidSimplePay(req.scope, back.o, back.t)
    res.json({ event: back.e, status: "not_paid", ...restored })
    return
  }

  res.json({ event: back.e, status: "pending" })
}
