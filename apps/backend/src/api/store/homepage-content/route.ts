import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  forStore,
  resolveHomepageContentService,
} from "../../admin/homepage-content/helpers"

/**
 * The home page content, or `null` when the OS has not written any yet: the
 * storefront then renders its starting values, so an empty shop still has a
 * home page.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content = await resolveHomepageContentService(
    req.scope
  ).retrieveMainHomepageContent()
  res.json({ homepage_content: content ? forStore(content) : null })
}
