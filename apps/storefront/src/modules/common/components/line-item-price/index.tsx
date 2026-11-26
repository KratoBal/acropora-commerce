import {
  rendelesSorCsokkentes,
  sorCsokkentes,
} from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { hu } from "@lib/i18n/dictionary/hu"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
  /**
   * `live` (alapertelmezes, a kosar): a valtozat mostani metaadatabol. `purchase` (a rendeles oldalai): a sor sajat, vasarlaskor rogzitett
   * masolatabol; masolat nelkul nincs athuzas.
   */
  reduction?: "live" | "purchase"
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
  reduction = "live",
}: LineItemPriceProps) => {
  const currentPrice = item.total ?? 0
  // athuzas es szazalek csak valodi arcsokkentesnel (Omnibus 2/A.), a 30 napos legalacsonyabb arhoz, a kupon elotti egysegarral: lasd `sorCsokkentes`
  const csokkentes =
    reduction === "purchase"
      ? rendelesSorCsokkentes(item, currencyCode)
      : sorCsokkentes(item, currencyCode)
  const hasReducedPrice = csokkentes !== null

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div className="text-left">
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">
                  {hu.product.originalPrice}{" "}
                </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                {convertToLocale({
                  amount: csokkentes.line_reference_number,
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
          data-testid="product-price"
        >
          {convertToLocale({
            amount: currentPrice,
            currency_code: currencyCode,
          })}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
