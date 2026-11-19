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
  /** The announced price reduction (the 30-day lowest price as the reference), or null: no struck price, no percentage. */
  reduction: {
    reference_number: number
    reference: string
    /** Rounded DOWN; null when that is 0: no percentage badge. */
    percentage_diff: string | null
  } | null
}

export type StoreFreeShippingPrice = StorePrice & {
  target_reached: boolean
  target_remaining: number
  remaining_percentage: number
}
