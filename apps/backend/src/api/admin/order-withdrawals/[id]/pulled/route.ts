import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { markWithdrawalPulled } from "../../../../../workflows/utils/withdrawal/withdrawal"

/**
 * POST /admin/order-withdrawals/:id/pulled
 *
 * The OS says it has the declaration (it shows at the order). Idempotent: a second call changes nothing and answers
 * the same. 404: no such declaration.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const result = await markWithdrawalPulled(req.scope, req.params.id, new Date())
  if (result === "not_found") {
    res.status(404).json({ message: "Nincs ilyen elállási nyilatkozat." })
    return
  }
  res.json({ status: result })
}
