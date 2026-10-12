import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  forStore,
  resolveLandingPageService,
} from "../../admin/landing-pages/helpers"

/**
 * The published landing pages (the sitemap's list, SEO P1-14). No `take`, on
 * purpose, as for the brands (#538): the module service does not page by
 * default, and a `take` would add a silent cut-off.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pages = await resolveLandingPageService(req.scope).listLandingPages(
    { is_published: true },
    { order: { handle: "ASC" } }
  )
  res.json({ landing_pages: pages.map(forStore) })
}
