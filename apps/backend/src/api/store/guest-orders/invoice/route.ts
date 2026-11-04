import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { guestOrderOperations } from "../../../../workflows/utils/guest-order/operations"
import { findGuestOrderId } from "../../../../workflows/utils/guest-order/lookup"
import { invoiceLinkConfig, requestInvoiceLinks } from "../../../../workflows/utils/guest-order/invoice-link"
import type { StorePostGuestInvoiceType } from "./validators"

/**
 * POST /store/guest-orders/invoice
 *
 * The guest's invoice links for ONE order (V1.1): the order number and the e-mail address the customer ordered with identify the
 * order exactly as the lookup does (EVERY miss is ONE answer, 404 "Nem találtuk a rendelést."; the attempt limits are the
 * middleware's), and only then does the shop ask the OS for the order's download links. The answer is the links and the
 * invoice number, type and date, nothing else: no order id, no address. The OS being unreachable or not configured is a 503,
 * with a plain sentence, never the OS's own text.
 */
export const POST = async (req: MedusaRequest<StorePostGuestInvoiceType>, res: MedusaResponse) => {
  const { order_number, email } = req.validatedBody
  const orderId = await findGuestOrderId(
    { displayId: Number(order_number.replace(/^#/, "")), email },
    guestOrderOperations(req.scope),
  )
  if (!orderId) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const outcome = await requestInvoiceLinks(orderId, invoiceLinkConfig())
  if (outcome.kind === "unavailable") {
    res.status(503).json({ message: "A számla letöltése most nem érhető el." })
    return
  }
  res.json({ documents: outcome.documents })
}
