import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { forStore, resolveBrandService } from "../../admin/brands/helpers"

/**
 * The brands that have at least one product (the sitemap's list, SEO P0 PR 11).
 * A brand record with no product behind it would be a page with nothing on it,
 * so it is not offered.
 *
 * NO `take`, ON PURPOSE (barracuda review #538 A, measured 2026-10-12): the
 * module service's `list` does not page by default in Medusa 2.20.1 -- with no
 * `take`, `buildQuery` leaves `limit` undefined (`@medusajs/utils`
 * `dist/modules-sdk/build-query.js:13`). The 15-row default belongs to the HTTP
 * query layer, which these calls do not go through. A `take` here would add the
 * silent cut-off it was meant to prevent. Size today: ~1500 links, ~200 brands.
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
