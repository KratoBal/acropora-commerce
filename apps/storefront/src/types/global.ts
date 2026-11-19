import { StorePrice } from "@medusajs/types"

export type FeaturedProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
}

export type VariantPrice = {
  calculated_price_number: number
  calculated_price: string
  original_price_number: number
  original_price: string
  currency_code: string
  price_type: string
  percentage_diff: string
  /**
   * A VALODI ARCSOKKENTES (Omnibus 2/A., 4/2009 NGM rendelet; acrobot, eles-kiadasi feltetel 2, 2026-11-19): CSAK akkor van,
   * ha az akcios ar kisebb a 30 napos legalacsonyabb ARNAL (az OS irja a valtozat metaadatara), es az ELOZO AR ES A SZAZALEK
   * AHHOZ viszonyit, nem a listaarhoz (`original_price`). `null`: nincs athuzas, nincs szazalek.
   */
  reduction: {
    reference_price_number: number
    reference_price: string
    percentage_diff: string
  } | null
}

export type StoreFreeShippingPrice = StorePrice & {
  target_reached: boolean
  target_remaining: number
  remaining_percentage: number
}
