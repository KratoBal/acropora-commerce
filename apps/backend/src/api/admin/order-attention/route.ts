import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { attentionOperations, computeAttention } from "../../../workflows/utils/order-attention"

/**
 * GET /admin/order-attention
 *
 * The orders that need someone's eyes, for the OS to show where the shop works
 * (commerce-audit-p1, P1/6; see `order-attention.ts`): a mixed cart's missing
 * pickup order. A read only: nothing is closed or changed. Admin only, like
 * every `/admin` route.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const items = await computeAttention(attentionOperations(req.scope))
  res.json({ generated_at: new Date().toISOString(), count: items.length, items })
}
