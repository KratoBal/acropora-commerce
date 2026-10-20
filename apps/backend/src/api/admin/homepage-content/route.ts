import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../../../workflows/utils/storefront-revalidate"
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
  // the storefront keeps the content in its cache (tag `homepage-content`); a
  // failed call is logged, never thrown: the page expires on its own
  const config = storefrontRevalidateConfig(process.env)
  if (config)
    await sendStorefrontRevalidate(
      config,
      req.scope.resolve(ContainerRegistrationKeys.LOGGER),
      fetch,
      ["homepage-content"]
    )
  res.json({ homepage_content })
}
