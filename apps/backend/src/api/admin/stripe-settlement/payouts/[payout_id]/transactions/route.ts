import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { listPayoutTransactions } from "../../../../../../workflows/utils/stripe-settlement/feed"
import { createStripeReader } from "../../../../../../workflows/utils/stripe-settlement/reader"

/**
 * THE BALANCE TRANSACTIONS ONE STRIPE PAYOUT PAID OUT (A9, card 6339b04c; acrobot 56393).
 *
 *   GET /admin/stripe-settlement/payouts/po_.../transactions?starting_after=txn_...&limit=100
 *
 * Per row: type, amount, fee, net (Stripe's unit and the major unit), and the PaymentIntent, charge and refund ids the OS pairs to
 * an order. Stripe lists transactions for AUTOMATIC payouts only; a manual payout answers 400 and that is passed on as
 * such. Read only, like its sibling (see `../../route.ts`): this module exports GET and nothing else.
 */
export const AdminGetStripePayoutTransactionsParams = z
  .object({
    starting_after: z.string().regex(/^txn_[A-Za-z0-9]+$/).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  })
  .strict()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payoutId = req.params?.payout_id ?? ""
  if (!/^po_[A-Za-z0-9]+$/.test(payoutId))
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "payout_id must look like po_...")
  const parsed = AdminGetStripePayoutTransactionsParams.safeParse(req.query ?? {})
  if (!parsed.success)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid stripe payout transactions query: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    )
  const key = process.env.STRIPE_API_KEY?.trim() ?? ""
  if (!key) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "STRIPE_API_KEY is not set: there is nothing to read")
  res.json(
    await listPayoutTransactions(createStripeReader(key), {
      payoutId,
      startingAfter: parsed.data.starting_after,
      limit: parsed.data.limit,
    }),
  )
}
