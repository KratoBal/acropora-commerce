import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  /**
   * SAJAT FEJLEC NELKUL, HA MAR VAN CIME A HELYNEK.
   *
   * A starter angol fejlece ("Related products") egy magyar lapon all, es a vaz
   * 13. doboza MAR VISEL magyar cimet a tervbol. A ketto egymas alatt ket cim
   * lenne ugyanannak a listanak. Ez a kapcsolo csak a fejlecet hagyja el; a
   * lista, a lekerdezes es a szures valtozatlan.
   *
   * Alapertelmezesben HAMIS, tehat a mai (elo allat) lap semmit nem valtozik.
   *
   * ES EZERT NEM HOLT KOD A FEJLEC, hanem forditando: merve az elo lapon
   * (2026-09-07, acropora-divaricata), az elo allat termeklapjan MIND A KET
   * felirat megjelenik. Ott nincs vaz, tehat nincs doboz-cim, tehat az
   * elnyomas nem sul el. A muszaki lapon viszont nem latszik.
   */
  fejlecNelkul?: boolean
}

export default async function RelatedProducts({
  product,
  countryCode,
  fejlecNelkul = false,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // edit this function to define your related products logic
  const queryParams: HttpTypes.StoreProductListParams = {}
  if (region?.id) {
    queryParams.region_id = region.id
  }
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false

  const products = await listProducts({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id,
    )
  })

  if (!products.length) {
    return null
  }

  return (
    <div className="product-page-constraint">
      {fejlecNelkul ? null : (
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-base-regular text-gray-600 mb-6">
            Hasonló termékek
          </span>
          <p className="text-2xl-regular text-ui-fg-base max-w-lg">
            Ezek is érdekelhetnek.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((product) => (
          <li key={product.id}>
            <Product region={region} product={product} />
          </li>
        ))}
      </ul>
    </div>
  )
}
