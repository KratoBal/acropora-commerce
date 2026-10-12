import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { productIsNoindex } from "../../../services/merchant-feed-item"

const PAGE = 500

/**
 * The handles of the published products with their own robots noindex (t13,
 * card cc404355). The sitemap needs only this short list: fetching every
 * product's full `metadata` to read one key made the product listing 10.6x
 * larger (acrobot's stage measurement, 2026-10-12: 28 KB vs 299 KB per 100
 * products, ~4.3 MB per sitemap build). The metadata is read here, next to the
 * database, and only the handles travel. The id breaks created_at ties, so
 * offset paging does not skip or repeat a product (#539).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const handles: string[] = []
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["handle", "metadata"],
      filters: { status: "published" },
      pagination: { skip, take: PAGE, order: { created_at: "ASC", id: "ASC" } },
    })
    for (const p of data as {
      handle?: string | null
      metadata?: Record<string, unknown> | null
    }[])
      if (p.handle && productIsNoindex(p)) handles.push(p.handle)
    if (data.length < PAGE) break
  }
  res.json({ handles })
}
