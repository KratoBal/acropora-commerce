import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { WITHDRAWAL_STATUSES } from "../../../modules/order-withdrawal/types"
import { listWithdrawalsForOs } from "../../../workflows/utils/withdrawal/withdrawal"

/** The list query: a status (default `new`) and a limit (default 50, at most 100). Anything else is a 400. */
export const ListQuery = z
  .object({
    status: z.enum(WITHDRAWAL_STATUSES).default("new"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()

/**
 * GET /admin/order-withdrawals
 *
 * The withdrawal declarations for the OS to pull (V0.3): the oldest first. The OS shows each at its order and then
 * calls `POST .../:id/pulled`; a declaration is never deleted here.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = ListQuery.safeParse(req.query ?? {})
  if (!parsed.success) {
    res.status(400).json({ type: "invalid_data", message: "A szűrő érvénytelen." })
    return
  }
  res.json({ withdrawals: await listWithdrawalsForOs(req.scope, parsed.data) })
}
