import { MedusaError } from "@medusajs/framework/utils"

import type { PaymentRole } from "../../../workflows/utils/payment-eligibility"
import {
  SHIPPING_OPTION_ROLES,
  type ShippingOptionRole,
} from "../../../workflows/utils/shipping-eligibility"

/** One stored pair: a payment method a shipping method allows, at its place in the list. */
export type ShippingPaymentRuleInput = {
  shipping_role: ShippingOptionRole
  payment_role: PaymentRole
  position: number
}

/** The matrix the Admin sends: every shipping method with its payment methods, in the order they are offered. */
export type ShippingPaymentMatrix = Record<ShippingOptionRole, PaymentRole[]>

/**
 * PAIRS THAT CANNOT WORK, whatever the business wants (card e0e2378b). Not a
 * preference list: each one is a payment that needs a delivery or a visit that
 * the shipping method does not have.
 *
 * - Cash on delivery with store pickup: there is no delivery to collect on
 *   (Balázs, 2026-08-31).
 * - Paying in the shop with a courier: the customer never comes to the shop.
 */
const IMPOSSIBLE: { shipping: ShippingOptionRole[]; payment: PaymentRole; reason: string }[] = [
  {
    shipping: ["PICKUP"],
    payment: "COD",
    reason: "Személyes átvételnél nincs utánvét: nincs kiszállítás, amin fizetni lehetne.",
  },
  {
    shipping: ["GLS_NORMAL", "GLS_HEAVY", "FOXPOST"],
    payment: "PAY_AT_STORE",
    reason: "Futáros vagy csomagpontos szállításnál nincs fizetés az üzletben: a vevő nem jön be.",
  },
]

/**
 * The Admin's matrix as the rows to store. EVERY SHIPPING METHOD MUST BE THERE
 * AND KEEP AT LEAST ONE PAYMENT METHOD: the checkout offers nothing for a method
 * with an empty list, so an empty list would close that shipping method without
 * anyone deciding to. Positions follow the list order, from 1.
 */
export const matrixToRows = (matrix: ShippingPaymentMatrix): ShippingPaymentRuleInput[] => {
  const rows: ShippingPaymentRuleInput[] = []
  for (const shipping of SHIPPING_OPTION_ROLES) {
    const payments = matrix[shipping]
    if (!payments?.length)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A(z) ${shipping} szállítási módnál legalább egy fizetési mód kell: üres listával a pénztár semmit nem kínálna.`
      )
    if (new Set(payments).size !== payments.length)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A(z) ${shipping} szállítási mód listájában egy fizetési mód kétszer szerepel.`
      )
    for (const rule of IMPOSSIBLE)
      if (rule.shipping.includes(shipping) && payments.includes(rule.payment))
        throw new MedusaError(MedusaError.Types.INVALID_DATA, rule.reason)
    payments.forEach((payment, index) =>
      rows.push({ shipping_role: shipping, payment_role: payment, position: index + 1 })
    )
  }
  return rows
}
