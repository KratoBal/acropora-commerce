import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  requestBrandsRevalidate,
  resolveBrandService,
} from "../../brands/helpers"
import { AdminPutProductBrandType } from "../../brands/validators"

/** A product with no row has no brand: `os_brand_id: null`, never a 404. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const product_id = req.params.product_id
  const [row] = await resolveBrandService(req.scope).listProductBrands(
    { product_id },
    { take: 1 }
  )
  res.json({
    product_brand: { product_id, os_brand_id: row?.os_brand_id ?? null },
  })
}

export const PUT = async (
  req: MedusaRequest<AdminPutProductBrandType>,
  res: MedusaResponse
) => {
  const product_id = req.params.product_id
  const { os_brand_id } = req.validatedBody
  await resolveBrandService(req.scope).setProductBrand(product_id, os_brand_id)
  requestBrandsRevalidate(req.scope)
  res.json({ product_brand: { product_id, os_brand_id } })
}
