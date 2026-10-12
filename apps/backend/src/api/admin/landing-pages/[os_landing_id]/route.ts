import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveLandingPageService } from "../helpers"
import { AdminPutLandingPageType } from "../validators"

/**
 * `os_landing_id` is the Acropora OS landing page id: the OS is the owner and
 * the only writer, and it addresses pages by its own id (SEO P1-14).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [landing_page] = await resolveLandingPageService(
    req.scope
  ).listLandingPages({ os_landing_id: req.params.os_landing_id }, { take: 1 })
  res.json({ landing_page: landing_page ?? null })
}

export const PUT = async (
  req: MedusaRequest<AdminPutLandingPageType>,
  res: MedusaResponse
) => {
  const landing_page = await resolveLandingPageService(
    req.scope
  ).upsertLandingPageByOsId(req.params.os_landing_id, req.validatedBody)
  res.json({ landing_page })
}

/** The OS deleted the page. Idempotent: an unknown id is not an error. */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const deleted = await resolveLandingPageService(
    req.scope
  ).deleteLandingPageByOsId(req.params.os_landing_id)
  res.json({ os_landing_id: req.params.os_landing_id, deleted })
}
