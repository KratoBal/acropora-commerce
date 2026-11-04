import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { markPulled } from "../../../../../workflows/utils/problem-report/report"

/**
 * POST /admin/order-problem-reports/:id/pulled
 *
 * The OS says it has the report (its ticket is open). Idempotent: a second call changes nothing and answers
 * the same. 404: no such report.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const result = await markPulled(req.scope, req.params.id, new Date())
  if (result === "not_found") {
    res.status(404).json({ message: "Nincs ilyen bejelentés." })
    return
  }
  res.json({ status: result })
}
