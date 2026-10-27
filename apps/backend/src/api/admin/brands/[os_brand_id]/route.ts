import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requestBrandsRevalidate, resolveBrandService } from "../helpers"
import { AdminPutBrandType } from "../validators"

/**
 * `os_brand_id` is the Acropora OS brand id: the OS is the owner and the only
 * writer, and it addresses brands by its own id (SEO P0 PR 11).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [brand] = await resolveBrandService(req.scope).listBrands(
    { os_brand_id: req.params.os_brand_id },
    { take: 1 }
  )
  res.json({ brand: brand ?? null })
}

export const PUT = async (
  req: MedusaRequest<AdminPutBrandType>,
  res: MedusaResponse
) => {
  const brand = await resolveBrandService(req.scope).upsertBrandByOsId(
    req.params.os_brand_id,
    req.validatedBody
  )
  requestBrandsRevalidate(req.scope)
  res.json({ brand })
}
