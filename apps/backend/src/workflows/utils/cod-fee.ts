import { MedusaError } from "@medusajs/framework/utils"

import { COMMERCE_SETTINGS_MODULE } from "../../modules/commerce-settings"
import { PaymentRole } from "./payment-eligibility"

/**
 * The cash-on-delivery fee.
 *
 * The amount is NOT a business constant. It lives in the commerce-settings
 * module so it can be changed without a deployment, and the number below is
 * only the value used when nothing has been stored yet. It appears in exactly
 * one place in the codebase, here.
 */
export const CASH_ON_DELIVERY_FEE_SETTING_KEY = "cash_on_delivery_fee_huf"

export const DEFAULT_CASH_ON_DELIVERY_FEE_HUF = 450

export const CASH_ON_DELIVERY_FEE_SETTING_DESCRIPTION =
  "Utánvét kezelési díj, forintban. Csak utánvétes fizetésnél számítjuk fel, rendelésenként egyszer."

/**
 * Validates a fee value.
 *
 * HUF has no minor unit, so the fee is a whole number of forints. Zero is a
 * valid business decision (the fee is waived); a negative fee is not, because
 * it would silently pay the customer.
 */
export const normalizeCashOnDeliveryFee = (raw: unknown): number => {
  const value = typeof raw === "string" ? Number(raw) : raw

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_FEE_SETTING_KEY} must be a number, received ${JSON.stringify(raw)}`
    )
  }

  if (!Number.isInteger(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_FEE_SETTING_KEY} must be a whole number of forints, received ${value}`
    )
  }

  if (value < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_FEE_SETTING_KEY} must not be negative, received ${value}`
    )
  }

  return value
}

/**
 * Reads the configured fee.
 *
 * A missing row is not an error: it means nothing has been configured yet, and
 * the default applies. A stored but invalid value IS an error, because silently
 * charging a different amount than the one on the record is worse than failing.
 */
export const getCashOnDeliveryFee = async (container: {
  resolve: (key: string) => any
}): Promise<number> => {
  const service = container.resolve(COMMERCE_SETTINGS_MODULE)

  const [setting] = await service.listCommerceSettings(
    { key: CASH_ON_DELIVERY_FEE_SETTING_KEY },
    { take: 1 }
  )

  if (!setting) {
    return DEFAULT_CASH_ON_DELIVERY_FEE_HUF
  }

  return normalizeCashOnDeliveryFee(setting.value)
}

/**
 * How much the cash-on-delivery fee adds to this cart.
 *
 * Returns the fee only when cash on delivery is BOTH selected and allowed by
 * the selected shipping method. That single condition covers the whole
 * lifecycle: switching to card payment, and switching to a shipping method
 * where cash on delivery is not offered, both make it zero.
 *
 * The fee is per order, not per item: nothing here multiplies by quantity.
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
