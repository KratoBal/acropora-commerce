import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { forStore, resolveBrandService } from "../../admin/brands/helpers"

/**
 * The brands that have at least one product (the sitemap's list, SEO P0 PR 11).
 * A brand record with no product behind it would be a page with nothing on it,
 * so it is not offered.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveBrandService(req.scope)
  const links = await service.listProductBrands({}, { select: ["os_brand_id"] })
  const withProducts = Array.from(new Set(links.map((l) => l.os_brand_id)))
  const brands = withProducts.length
    ? await service.listBrands(
        { os_brand_id: withProducts },
        { order: { handle: "ASC" } }
      )
    : []
  res.json({ brands: brands.map(forStore) })
}
