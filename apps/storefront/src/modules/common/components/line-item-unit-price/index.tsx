import { convertToLocale } from "@lib/util/money"
import {
  rendelesSorCsokkentes,
  sorCsokkentes,
} from "@lib/util/get-product-price"
import { hu } from "@lib/i18n/dictionary/hu"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
  /**
   * `live` (alapertelmezes, a kosar): a valtozat mostani metaadatabol. `purchase` (a rendeles oldalai): a sor sajat, vasarlaskor rogzitett
   * masolatabol; masolat nelkul nincs athuzas.
   */
  reduction?: "live" | "purchase"
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
  reduction = "live",
}: LineItemUnitPriceProps) => {
  const total = item.total ?? 0
  // athuzas es szazalek csak valodi arcsokkentesnel (Omnibus 2/A.), a 30 napos legalacsonyabb arhoz, a kupon elotti egysegarral: lasd `sorCsokkentes`
  const csokkentes =
    reduction === "purchase"
      ? rendelesSorCsokkentes(item, currencyCode)
      : sorCsokkentes(item, currencyCode)
  const hasReducedPrice = csokkentes !== null

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className="text-ui-fg-muted">
                {hu.product.originalPrice}{" "}
              </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {convertToLocale({
                amount: csokkentes.unit_reference_number,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && csokkentes.percentage_diff && (
            <span className="text-ui-fg-interactive">
              -{csokkentes.percentage_diff}%
            </span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: total / item.quantity,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
