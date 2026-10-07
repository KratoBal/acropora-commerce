import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  valtozatId,
}: {
  id: string
  region: HttpTypes.StoreRegion
  /** A cimbol jovo valtozat (FE-7 3. resz, `_v` belso ut). */
  valtozatId?: string
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  return (
    <ProductActions product={product} region={region} valtozatId={valtozatId} />
  )
}
