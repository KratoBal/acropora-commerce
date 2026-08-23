import {
  CommerceSettingsService,
  getCommerceSettingValue,
} from "../../modules/commerce-settings/accessor"
import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  COMMERCE_SETTING_DEFINITIONS,
  DEFAULT_CASH_ON_DELIVERY_FEE_HUF,
  normalizeCommerceSettingValue,
} from "../../modules/commerce-settings/definitions"
import { PaymentRole } from "./payment-eligibility"

/**
 * The cash-on-delivery fee.
 *
 * The amount is NOT a business constant. It lives in the commerce-settings
 * module so it can be changed without a deployment. Its approved fallback is
 * owned by the central commerce-setting definition and re-exported here for
 * backwards compatibility.
 */
export { CASH_ON_DELIVERY_FEE_SETTING_KEY, DEFAULT_CASH_ON_DELIVERY_FEE_HUF }

export const CASH_ON_DELIVERY_FEE_SETTING_DESCRIPTION =
  COMMERCE_SETTING_DEFINITIONS[CASH_ON_DELIVERY_FEE_SETTING_KEY].description

/**
 * Validates a fee value.
 *
 * HUF has no minor unit, so the fee is a whole number of forints. Zero is a
 * valid business decision (the fee is waived); a negative fee is not, because
 * it would silently pay the customer.
 */
export const normalizeCashOnDeliveryFee = (raw: unknown): number => {
  return normalizeCommerceSettingValue(CASH_ON_DELIVERY_FEE_SETTING_KEY, raw)
}

/**
 * Reads the configured fee.
 *
 * A missing row is not an error: it means nothing has been configured yet, and
 * the default applies. A stored but invalid value IS an error, because silently
 * charging a different amount than the one on the record is worse than failing.
 */
export const getCashOnDeliveryFee = async (
  service: CommerceSettingsService,
): Promise<number> =>
  getCommerceSettingValue(service, CASH_ON_DELIVERY_FEE_SETTING_KEY)

/**
 * How much the cash-on-delivery fee adds to this cart.
 *
 * Returns the fee only when cash on delivery is BOTH selected and allowed by
 * the selected shipping method. That single condition covers the whole
 * lifecycle: switching to card payment, and switching to a shipping method
 * where cash on delivery is not offered, both make it zero.
 *
 * The fee is per order, not per item: nothing here multiplies by quantity.
 *
 * This REPORTS the amount, it does not apply it. The mechanism that wrote the
 * fee onto the cart represented it as a negative discount and was removed; the
 * clean replacement is a separate decision. Until then the only consumer is the
 * store payment-options endpoint, which reports the number.
 */
export const resolveCashOnDeliveryFeeAmount = ({
  selectedPaymentRole,
  allowedPaymentRoles,
  feeHuf,
}: {
  selectedPaymentRole: PaymentRole | null | undefined
  allowedPaymentRoles: PaymentRole[]
  feeHuf: number
}): number => {
  if (selectedPaymentRole !== "COD") {
    return 0
  }

  if (!allowedPaymentRoles.includes("COD")) {
    return 0
  }

  return normalizeCashOnDeliveryFee(feeHuf)
}
