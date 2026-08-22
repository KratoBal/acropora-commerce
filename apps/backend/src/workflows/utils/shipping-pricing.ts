import { ShippingPricingSettings } from "../../modules/commerce-settings/accessor"
import {
  FREE_SHIPPING_THRESHOLD_SETTING_KEY,
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

export const isFreeShippingThresholdRole = (
  role: ShippingOptionRole
): boolean => role === "GLS_NORMAL" || role === "FOXPOST"

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
  const threshold = normalizeNonNegativeWholeHuf(
    settings.free_shipping_threshold_huf,
    FREE_SHIPPING_THRESHOLD_SETTING_KEY
  )

  if (isFreeShippingThresholdRole(role) && goodsTotal >= threshold) {
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
