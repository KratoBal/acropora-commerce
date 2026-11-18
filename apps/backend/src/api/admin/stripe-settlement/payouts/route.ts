import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { listPayouts } from "../../../../workflows/utils/stripe-settlement/feed"
import { createStripeReader } from "../../../../workflows/utils/stripe-settlement/reader"

/**
 * STRIPE'S PAYOUTS, READ FOR THE OS'S SETTLEMENT PAGE (A9, card 6339b04c; acrobot 56393).
 *
 *   GET /admin/stripe-settlement/payouts?created_gte=<unix>&status=paid&starting_after=po_...&limit=50
 *
 * READ ONLY, and the test holds it to that: this module exports GET and nothing else, and the reader behind it can send
 * only a GET to `balance_transactions`, `payouts` and `payment_intents/<id>`. Admin only, like every `/admin` route. The
 * answer carries ids and figures, no name, e-mail, card or key. The query is checked here, not in `middlewares.ts`.
 */
export const AdminGetStripePayoutsParams = z
  .object({
    created_gte: z.coerce.number().int().min(0).optional(),
    status: z.enum(["paid", "pending", "in_transit", "canceled", "failed"]).optional(),
    starting_after: z.string().regex(/^po_[A-Za-z0-9]+$/).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = AdminGetStripePayoutsParams.safeParse(req.query ?? {})
  if (!parsed.success)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid stripe payouts query: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    )
  const key = process.env.STRIPE_API_KEY?.trim() ?? ""
  if (!key) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "STRIPE_API_KEY is not set: there is nothing to read")
  const { created_gte, status, starting_after, limit } = parsed.data
  res.json(
    await listPayouts(createStripeReader(key), {
      createdGte: created_gte,
      status,
      startingAfter: starting_after,
      limit,
    }),
  )
}
