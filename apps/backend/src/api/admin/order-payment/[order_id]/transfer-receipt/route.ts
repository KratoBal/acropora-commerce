import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { recordTransferReceipt } from "../../../../../workflows/utils/order-payment/transfer-receipt"
import { transferReceiptOperations } from "../../../../../workflows/utils/order-payment/transfer-receipt-operations"
import { answerRefusal } from "../../../../refusal"
import type { AdminRecordTransferReceiptType } from "../../validators"

/**
 * "MEGJÖTT AZ ELŐRE UTALÁS" (card bb3a6bd5): the OS paired the bank credit or
 * a person recorded it, and the order becomes paid here too. A refusal (not a
 * bank-transfer order, a different amount, nothing waiting) is a 409 in
 * Hungarian; calling it again after the capture reports `recorded: false`.
 */
export const POST = async (req: MedusaRequest<AdminRecordTransferReceiptType>, res: MedusaResponse) => {
  const { order_id } = req.params
  try {
    const result = await recordTransferReceipt(order_id, req.validatedBody, transferReceiptOperations(req.scope))
    res.json(result)
  } catch (error) {
    if (answerRefusal(res, error)) return
    throw error
  }
}
