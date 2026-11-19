import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-percentage-diff"
import { convertToLocale } from "./money"
import { omnibusReferenceOf } from "./omnibus"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    original_amount: number
    currency_code: string
    calculated_price: {
      price_list_type: string
    }
  }
}

/**
 * AZ ARCSOKKENTES KOZLESE: ATHUZOTT "ELOZO AR" ES SZAZALEK CSAK A 30 NAPOS LEGALACSONYABB AR ALAPJAN (card 54bb3779, acrobot
 * 2026-11-19; 4/2009. (III. 31.) rendelet 2/A. §, az Omnibus-iranyelv). Ha a bolt arcsokkentest kozol, a "korabbi ar" az
 * arcsokkentes elotti 30 nap LEGALACSONYABB ara, nem a Medusa alapara: egy fagyott UNAS-alapar (vagy egy korabbi akcio-sorozat
 * utan a regi ar) nem valodi korabbi eladasi ar. A hivatkozasi ar az OS-tol jon, a valtozat `omnibus_lowest_price_30d` metaadatabol
 * (`omnibusReferenceOf`); a kozles CSAK akkor all, ha
 *   - az ar akcios (`sale` arlista), ES
 *   - van ervenyes hivatkozasi ar, ES a vevo ara KISEBB nala.
 * Egyebkent nincs athuzott ar, nincs szazalek, nincs kiemeles: az ar egyszeruen az ara. A szazalek a hivatkozasi arhoz jar.
 */
export type ArCsokkentes = {
  reference_number: number
  reference: string
  percentage_diff: string
}

export const arCsokkentesOf = (
  variant: VariantWithPrice | undefined | null,
): ArCsokkentes | null => {
  const price = variant?.calculated_price
  if (!price?.calculated_amount) return null
  if (price.calculated_price?.price_list_type !== "sale") return null
  const reference = omnibusReferenceOf(variant?.metadata, {
    amount: price.calculated_amount,
    currencyCode: price.currency_code,
  })
  if (!reference) return null
  return {
    reference_number: reference.amount,
    reference: convertToLocale({
      amount: reference.amount,
      currency_code: price.currency_code,
    }),
    percentage_diff: getPercentageDiff(
      reference.amount,
      price.calculated_amount,
    ),
  }
}

export const getPricesForVariant = (variant: VariantWithPrice) => {
  if (!variant?.calculated_price?.calculated_amount) {
    return null
  }

  return {
    reduction: arCsokkentesOf(variant),
    calculated_price_number: variant.calculated_price.calculated_amount,
    calculated_price: convertToLocale({
      amount: variant.calculated_price.calculated_amount,
      currency_code: variant.calculated_price.currency_code,
    }),
    original_price_number: variant.calculated_price.original_amount,
    original_price: convertToLocale({
      amount: variant.calculated_price.original_amount,
      currency_code: variant.calculated_price.currency_code,
    }),
    currency_code: variant.calculated_price.currency_code,
    price_type: variant.calculated_price.calculated_price.price_list_type,
    percentage_diff: getPercentageDiff(
      variant.calculated_price.original_amount,
      variant.calculated_price.calculated_amount,
    ),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant = (product.variants as VariantWithPrice[])
      .filter((v) => !!v.calculated_price)
      .sort((a, b) => {
        return (
          (a.calculated_price?.calculated_amount ?? 0) -
          (b.calculated_price?.calculated_amount ?? 0)
        )
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId,
    ) as VariantWithPrice | undefined

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
