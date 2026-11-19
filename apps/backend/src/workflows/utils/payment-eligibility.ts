import { ShippingOptionRole } from "./shipping-eligibility"
import type { ShippingRolePayments } from "./shipping-payment-rules"

/**
 * Payment eligibility is decided by the SELECTED SHIPPING OPTION, not by the
 * cart's shipping class.
 *
 * The two are not the same question. The shipping class says what the cart is
 * allowed to use; the payment rules depend on what the customer actually picked.
 * A NORMAL cart may end up on store pickup, and then cash on delivery must not
 * be offered even though the cart itself was never restricted.
 */
export const PAYMENT_ROLES = [
  "ONLINE_CARD",
  "COD",
  "PAY_AT_STORE",
  "BANK_TRANSFER",
] as const

export type PaymentRole = (typeof PAYMENT_ROLES)[number]

/**
 * The payment methods allowed for a set of selected shipping roles, from the
 * matrix the `shipping_payment_rule` table holds (`loadShippingRolePayments`;
 * the decisions behind the starting rows are recorded at
 * `SHIPPING_PAYMENT_RULE_SEED`). The table is the only source since card
 * e0e2378b: the code matrix that used to be here is gone, so the Admin's change
 * is the one the checkout follows.
 *
 * The INTERSECTION is deliberate. A cart can carry one shipping method per
 * shipping profile, and although Acropora runs a single profile today, a payment
 * method must be allowed by every selected shipping method, not just one of
 * them. Taking the union would let a heavy delivery be paid cash on delivery
 * because some other method allowed it.
 *
 * THE ORDER is the first selected shipping method's own order (its rows'
 * `position`): that is the list the customer reads, and the Admin sets it.
 *
 * No selected shipping method means no decision yet, so nothing is offered.
 */
export const allowedPaymentRolesFor = (
  shippingRoles: ShippingOptionRole[],
  rolePayments: ShippingRolePayments
): PaymentRole[] => {
  if (!shippingRoles.length) {
    return []
  }

  return (rolePayments[shippingRoles[0]] ?? []).filter((paymentRole) =>
    shippingRoles.every((shippingRole) =>
      (rolePayments[shippingRole] ?? []).includes(paymentRole)
    )
  )
}

export const isPaymentRoleAllowedFor = (
  paymentRole: PaymentRole,
  shippingRoles: ShippingOptionRole[],
  rolePayments: ShippingRolePayments
): boolean =>
  allowedPaymentRolesFor(shippingRoles, rolePayments).includes(paymentRole)
