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
  /** LEFELE kerekitve, es `null`, ha 0 (barracuda #824): a kozolt csokkentes nem lehet nagyobb a valodinal; nulla szazaleknak nincs jelzo. */
  percentage_diff: string | null
}

/**
 * A SZAZALEK LEFELE KEREKITVE (barracuda #824): a `getPercentageDiff` a legkozelebbi egeszre kerekit, tehat felfele is (10 000-es
 * hivatkozas, 6 650-es ar: valodi csokkentes 33,5 %, a kartyan -34% allt). A kozolt arcsokkentes nem lehet nagyobb a valodinal, es
 * ez az a szam, amit a 30 napos legalacsonyabb arhoz merunk. Ha a lefele kerekitett ertek 0, nincs szazalek-jelzo (`null`); az
 * athuzott ar marad. (A `getPercentageDiff` a tobbi hivo miatt valtozatlan.)
 */
export const szazalekLefele = (
  reference: number,
  ar: number,
): string | null => {
  const szazalek = Math.floor(((reference - ar) / reference) * 100)
  return szazalek > 0 ? String(szazalek) : null
}

/**
 * A KOZLES MAGJA, EGY HELYEN (acrobot 57134 es 57179): a termeklapon, a kartyan, a ragados savban, az elonezetben ES a kosarban/rendelesben
 * ugyanaz a fuggveny dont. A fizetendo EGYSEGAR es a valtozat metaadata (a 30 napos legalacsonyabb ar) kell hozza: kozles csak akkor van,
 * ha a hivatkozasi ar ervenyes ES nagyobb az aranal (`omnibusReferenceOf`); a szazalek a hivatkozasi arhoz jar, lefele kerekitve.
 */
export const arCsokkentesAr = (
  metadata: Record<string, unknown> | null | undefined,
  amount: number,
  currencyCode: string,
): ArCsokkentes | null => {
  const reference = omnibusReferenceOf(metadata, { amount, currencyCode })
  if (!reference) return null
  return {
    reference_number: reference.amount,
    reference: convertToLocale({
      amount: reference.amount,
      currency_code: currencyCode,
    }),
    percentage_diff: szazalekLefele(reference.amount, amount),
  }
}

export const arCsokkentesOf = (
  variant: VariantWithPrice | undefined | null,
): ArCsokkentes | null => {
  const price = variant?.calculated_price
  if (!price?.calculated_amount) return null
  if (price.calculated_price?.price_list_type !== "sale") return null
  return arCsokkentesAr(
    variant?.metadata,
    price.calculated_amount,
    price.currency_code,
  )
}

/**
 * A KOSAR- ES RENDELES-SOR KOZLESE (acrobot 57134 es 57179, barracuda 57178): ugyanaz a fuggveny (`arCsokkentesAr`), a sor EGYSEGARA a
 * KEDVEZMENY ELOTTI egysegar (`unit_price`, a Medusa sorarat az arlista utan, de a kupon es a tobbi kosar-kedvezmeny ELOTT adja), NEM
 * a `total / quantity`: a kupon nem arcsokkentes, nem huzhat at es nem adhat szazalekot, es egy akcios sor szazaleka nem fugg a kupontol.
 * A hivatkozasi ar a sor valtozatanak metaadatabol jon (`*items.variant`, a kosar mezoi kozott van). Adat nelkul (nincs valtozat, nincs
 * metaadat, nincs `unit_price`) a sor NEM huz at: csak a fizetendo ar latszik.
 */
export type SorCsokkentes = {
  unit_reference_number: number
  line_reference_number: number
  /** lefele kerekitve, `null` ha 0: az athuzas marad, szazalek-jelzo nincs */
  percentage_diff: string | null
}

export const sorCsokkentes = (
  item: {
    unit_price?: number | null
    quantity?: number | null
    variant?: { metadata?: Record<string, unknown> | null } | null
  },
  currencyCode: string,
): SorCsokkentes | null => {
  if (!item.unit_price || item.unit_price <= 0) return null
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  const csokkentes = arCsokkentesAr(
    item.variant?.metadata,
    item.unit_price,
    currencyCode,
  )
  return csokkentes
    ? {
        unit_reference_number: csokkentes.reference_number,
        line_reference_number: csokkentes.reference_number * quantity,
        percentage_diff: csokkentes.percentage_diff,
      }
    : null
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
