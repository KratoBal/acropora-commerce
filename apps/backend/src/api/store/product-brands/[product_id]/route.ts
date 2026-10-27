import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { resolveBrandService } from "../../../admin/brands/helpers"
import { brandNames, type BrandReader } from "../../../../services/merchant-feed-loader"

/**
 * A PRODUCT'S BRAND NAME FOR THE PRODUCT PAGE (audit S4): the page's JSON-LD
 * `brand` and the Merchant feed's `brand` are the same fact and must say the
 * same thing. The feed reads the brand module (`brandNames`, the loader's own
 * function, used here as it is), the page used to read the collection title;
 * the page now asks this route, so there is ONE reading, not two that agree
 * today.
 *
 * Only a PUBLISHED product answers with its name; anything else answers "no
 * brand", as a product without one does, so the route does not tell which ids
 * exist (the product-knowledge route's rule). A brand name is public data.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const product_id = req.params.product_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: product_id, status: "published" },
  })
  if (!products.length) {
    res.json({ product_brand: { product_id, name: null } })
    return
  }
  const names = await brandNames(
    resolveBrandService(req.scope) as unknown as BrandReader,
    [product_id]
  )
  res.json({ product_brand: { product_id, name: names[product_id] ?? null } })
}
