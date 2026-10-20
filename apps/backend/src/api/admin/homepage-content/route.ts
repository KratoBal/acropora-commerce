import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveHomepageContentService } from "./helpers"
import { AdminPutHomepageContentType } from "./validators"

/**
 * The home page content record. The Acropora OS is the owner and the only
 * writer; it writes the whole record in one body.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const homepage_content = await resolveHomepageContentService(
    req.scope
  ).retrieveMainHomepageContent()
  res.json({ homepage_content })
}

export const PUT = async (
  req: MedusaRequest<AdminPutHomepageContentType>,
  res: MedusaResponse
) => {
  const homepage_content = await resolveHomepageContentService(
    req.scope
  ).upsertMainHomepageContent(req.validatedBody)
  res.json({ homepage_content })
}
