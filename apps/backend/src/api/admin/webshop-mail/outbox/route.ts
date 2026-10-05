import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { stuckWebshopMails } from "../../../../workflows/utils/webshop-mail/deliver"
import type { AdminGetWebshopMailOutboxParamsType } from "./validators"

/**
 * GET /admin/webshop-mail/outbox?stuck=true&limit=&offset=
 *
 * The shop's mails that did not go (Balázs, 2026-10-05: reported in the OS
 * and to acrobot): a template that cannot render, a wrong token, or an hour
 * unsent. `{ items, count }`, newest first; each item says why
 * (`failure_kind`, `last_error` in the OS's own words).
 */
export const GET = async (req: MedusaRequest<unknown, AdminGetWebshopMailOutboxParamsType>, res: MedusaResponse) => {
  const { limit, offset } = req.validatedQuery as AdminGetWebshopMailOutboxParamsType
  res.json(await stuckWebshopMails(req.scope, { limit, offset }))
}
