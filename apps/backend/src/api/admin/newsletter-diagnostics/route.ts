import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { newsletterDiagnostics } from "../../../workflows/utils/newsletter-diagnostics"

/**
 * GET /admin/newsletter-diagnostics?limit=20
 *
 * What became of the newsletter's confirmation mails (see `newsletter-diagnostics.ts`): the last sign-ups with the result each row kept,
 * the newsletter's rows in the mail outbox, and the sender's four preconditions as booleans from the answering process. Read only, admin
 * only, no secret and no full address. A failed read is an error, not an empty list. `limit` is 1 to 100 (20 by default).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const asked = Number(req.query?.limit ?? 20)
  const limit = Number.isInteger(asked) && asked >= 1 && asked <= 100 ? asked : 20
  res.json(await newsletterDiagnostics(req.scope, limit))
}
