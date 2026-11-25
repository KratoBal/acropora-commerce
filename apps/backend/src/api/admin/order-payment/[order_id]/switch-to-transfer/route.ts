import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { switchToBankTransfer } from "../../../../../workflows/utils/order-payment/switch-to-transfer"
import { switchToTransferOperations } from "../../../../../workflows/utils/order-payment/switch-to-transfer-operations"
import { answerRefusal } from "../../../../refusal"
import type { AdminSwitchOrderToTransferType } from "../../validators"

/**
 * "ÁTÁLLÍTÁS ELŐRE UTALÁSRA" (card d31a66a3; Balázs, 2026-11-25 10:19 UTC): the OS switches a placed order to bank transfer after
 * the customer agreed to a deposit by phone. A refusal (paid already, shipped or closed, a mixed cart's pair, an unknown method) is
 * a 409 in Hungarian; a second press on a switched order answers `switched: false`. No mail goes from here: the proforma, sent
 * from the OS, is what the customer gets next.
 */
export const POST = async (req: MedusaRequest<AdminSwitchOrderToTransferType>, res: MedusaResponse) => {
  const { order_id } = req.params
  try {
    const result = await switchToBankTransfer(order_id, req.validatedBody, switchToTransferOperations(req.scope))
    res.json(result)
  } catch (error) {
    if (answerRefusal(res, error)) return
    throw error
  }
}
