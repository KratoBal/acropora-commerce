import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  forStore,
  resolveLandingPageService,
} from "../../../admin/landing-pages/helpers"

/**
 * The landing page's record by its handle (`/hu/valogatas/{handle}`). An
 * unpublished page answers the same 404 as an unknown one, so the route does
 * not tell which drafts exist.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [page] = await resolveLandingPageService(req.scope).listLandingPages(
    { handle: req.params.handle, is_published: true },
    { take: 1 }
  )
  if (!page)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Landing page with handle ${req.params.handle} was not found`
    )
  res.json({ landing_page: forStore(page) })
}
