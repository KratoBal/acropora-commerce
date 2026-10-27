import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { setPickupRetrySkip } from "../../../../workflows/utils/pickup-retry-skip"
import type { AdminPostPickupSkipType } from "./validators"

/**
 * POST /admin/order-attention/pickup-skip
 *
 * Mark a shipped cart "do not retry its pickup order" (or clear the mark with
 * `skip: false`); see `pickup-retry-skip.ts`. 404: no such cart; 409: the cart
 * is not the shipped half of a mixed cart. The actor and the time are the
 * server's. Admin only, like every `/admin` route.
 */
export const POST = async (req: MedusaRequest<AdminPostPickupSkipType>, res: MedusaResponse) => {
  const { parent_cart_id, skip, reason } = req.validatedBody
  const result = await setPickupRetrySkip(req.scope, parent_cart_id, {
    skip,
    reason,
    by: (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ?? null,
  })
  if (result.status === "not_found") {
    res.status(404).json({ message: "No such cart." })
    return
  }
  if (result.status === "not_a_mixed_cart") {
    res.status(409).json({ message: "This is not the shipped half of a completed mixed cart." })
    return
  }
  res.json({ parent_cart_id, skipped: result.skipped, marker: result.marker })
}
