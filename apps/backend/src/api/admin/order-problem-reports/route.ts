import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { PROBLEM_STATUSES } from "../../../modules/order-problem-report/types"
import { listReportsForOs } from "../../../workflows/utils/problem-report/report"

/** The list query: a status (default `new`) and a limit (default 50, at most 100). Anything else is a 400. */
export const ListQuery = z
  .object({
    status: z.enum(PROBLEM_STATUSES).default("new"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()

/**
 * GET /admin/order-problem-reports
 *
 * The problem reports for the OS to pull (V1.2): the oldest first, each with its photos' addresses. The OS opens
 * a ticket per report and then calls `POST .../:id/pulled`; a report is never deleted here.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = ListQuery.safeParse(req.query ?? {})
  if (!parsed.success) {
    res.status(400).json({ type: "invalid_data", message: "A szűrő érvénytelen." })
    return
  }
  res.json({ reports: await listReportsForOs(req.scope, parsed.data) })
}
