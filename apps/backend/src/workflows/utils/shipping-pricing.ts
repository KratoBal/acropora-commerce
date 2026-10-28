import { ShippingPricingSettings } from "../../modules/commerce-settings/accessor"
import {
  FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
  FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
  normalizeNonNegativeWholeHuf,
  SHIPPING_FOXPOST_SETTING_KEY,
  SHIPPING_GLS_HEAVY_SETTING_KEY,
  SHIPPING_GLS_NORMAL_SETTING_KEY,
} from "../../modules/commerce-settings/definitions"
import { ShippingOptionRole } from "./shipping-eligibility"

export type CalculateShippingPriceInput = {
  role: ShippingOptionRole
  goodsTotalHuf: number
  settings: ShippingPricingSettings
}

/**
 * The free-shipping threshold of a role, per carrier (Balázs, 2026-10-28): GLS
 * normal and Foxpost each have their own; heavy GLS and pickup have none (heavy
 * goods are not waived, as on the old shop's page, which lists one fixed price).
 */
export const freeShippingThresholdOf = (
  role: ShippingOptionRole,
  settings: ShippingPricingSettings
): number | null => {
  switch (role) {
    case "GLS_NORMAL":
      return normalizeNonNegativeWholeHuf(
        settings.free_shipping_threshold_gls_huf,
        FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY
      )
    case "FOXPOST":
      return normalizeNonNegativeWholeHuf(
        settings.free_shipping_threshold_foxpost_huf,
        FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY
      )
    default:
      return null
  }
}

/** Pure pricing policy for the future calculated-price provider. */
export const calculateShippingPrice = ({
  role,
  goodsTotalHuf,
  settings,
}: CalculateShippingPriceInput): number => {
  if (role === "PICKUP") {
    return 0
  }

  const goodsTotal = normalizeNonNegativeWholeHuf(
    goodsTotalHuf,
    "goods_total_huf"
  )
  const threshold = freeShippingThresholdOf(role, settings)

  if (threshold !== null && goodsTotal >= threshold) {
    return 0
  }

  switch (role) {
    case "GLS_NORMAL":
      return normalizeNonNegativeWholeHuf(
        settings.shipping_gls_normal_huf,
        SHIPPING_GLS_NORMAL_SETTING_KEY
      )
    case "GLS_HEAVY":
      return normalizeNonNegativeWholeHuf(
        settings.shipping_gls_heavy_huf,
        SHIPPING_GLS_HEAVY_SETTING_KEY
      )
    case "FOXPOST":
      return normalizeNonNegativeWholeHuf(
        settings.shipping_foxpost_huf,
        SHIPPING_FOXPOST_SETTING_KEY
      )
  }
}
