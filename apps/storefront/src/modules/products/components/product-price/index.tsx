import { clx } from "@modules/common/components/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  /**
   * A "-TOL" ALAK KET FELTETELHEZ KOTOTT, ES A MASODIK AZ UJ.
   *
   * Eddig `!variant && "From "` allt itt: angol szo egy magyar lapon, ES a
   * feltetel csak azt nezte, kaptunk-e valtozatot -- nem azt, hogy VAN-E
   * TOBB. Merve az elo lapon (2026-09-07): a muszaki termeklapon
   * "From 319 000 Ft" jelent meg, egyetlen valtozatu ("Alap") termeken.
   *
   * Ket baj egyszerre: a felirat angol, es egyetlen ar mellett a "-tol"
   * FELREVEZETO -- azt igeri, hogy van olcsobb valtozat is.
   *
   * A katalogusban 1884 terméknek EGYALTALAN nincs valtozata es 9-nek van
   * (korabbi meresem), tehat a regi alak a termekek tulnyomo tobbsegen
   * allitott valotlant.
   *
   * A magyar alak SUFFIX, nem prefix: "319 000 Ft-tol", nem "-tol 319 000 Ft".
   */
  const tolAlak = !variant && (product.variants?.length ?? 0) > 1

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  return (
    <div className="flex flex-col text-ui-fg-base">
      <span
        className={clx("text-xl-semi", {
          "text-ui-fg-interactive": selectedPrice.price_type === "sale",
        })}
      >
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
        {tolAlak ? <span data-testid="product-price-tol">-tól</span> : null}
      </span>
      {selectedPrice.price_type === "sale" && (
        <>
          <p>
            <span className="text-ui-fg-subtle">Original: </span>
            <span
              className="line-through"
              data-testid="original-product-price"
              data-value={selectedPrice.original_price_number}
            >
              {selectedPrice.original_price}
            </span>
          </p>
          <span className="text-ui-fg-interactive">
            -{selectedPrice.percentage_diff}%
          </span>
        </>
      )}
    </div>
  )
}
