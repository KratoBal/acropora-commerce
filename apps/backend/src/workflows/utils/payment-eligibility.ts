import { ShippingOptionRole } from "./shipping-eligibility"

/**
 * Payment eligibility is decided by the SELECTED SHIPPING OPTION, not by the
 * cart's shipping class.
 *
 * The two are not the same question. The shipping class says what the cart is
 * allowed to use; the payment rules depend on what the customer actually picked.
 * A NORMAL cart may end up on store pickup, and then cash on delivery must not
 * be offered even though the cart itself was never restricted.
 */
export const PAYMENT_ROLES = ["ONLINE_CARD", "COD", "PAY_AT_STORE"] as const

export type PaymentRole = (typeof PAYMENT_ROLES)[number]

/**
 * The single source of truth for payment eligibility.
 *
 * EVERY ROW HERE IS A BUSINESS DECISION, so each one says whose it was. The
 * table used to carry the decisions without recording them, and that is how a
 * live rule went a week without anyone knowing it was deliberate.
 *
 * `PICKUP` (Balázs, 2026-08-31): card or paying in the shop. No cash on
 * delivery - there is no delivery to collect on.
 *
 * `GLS_NORMAL` (Balázs, 2026-08-31): card or cash on delivery. This role also
 * covers the GLS parcel point, not only home delivery.
 *
 * `GLS_HEAVY` (Balázs, 2026-09-01, "Legyen utánvét"): card or cash on
 * delivery. Until that day this row read card only, and nothing said whether
 * that was a decision or an omission. It was an omission. The role covers BOTH
 * heavy options - home delivery and the heavy parcel point - so the answer
 * applies to both.
 *
 * `FOXPOST` (inherited from the original build, never separately confirmed):
 * card or cash on delivery. Balázs has not been asked about this one; it is
 * recorded as unconfirmed rather than presented as decided.
 */
export const SHIPPING_ROLE_PAYMENTS: Record<ShippingOptionRole, PaymentRole[]> =
  {
    PICKUP: ["ONLINE_CARD", "PAY_AT_STORE"],
    GLS_NORMAL: ["ONLINE_CARD", "COD"],
    GLS_HEAVY: ["ONLINE_CARD", "COD"],
    FOXPOST: ["ONLINE_CARD", "COD"],
  }

/**
 * The payment methods allowed for a set of selected shipping roles.
 *
 * The INTERSECTION is deliberate. A cart can carry one shipping method per
 * shipping profile, and although Acropora runs a single profile today, a payment
 * method must be allowed by every selected shipping method, not just one of
 * them. Taking the union would let a heavy delivery be paid cash on delivery
 * because some other method allowed it.
 *
 * No selected shipping method means no decision yet, so nothing is offered.
 */
export const allowedPaymentRolesFor = (
  shippingRoles: ShippingOptionRole[]
): PaymentRole[] => {
  if (!shippingRoles.length) {
    return []
  }

  return PAYMENT_ROLES.filter((paymentRole) =>
    shippingRoles.every((shippingRole) =>
      SHIPPING_ROLE_PAYMENTS[shippingRole].includes(paymentRole)
    )
  )
}

export const isPaymentRoleAllowedFor = (
  paymentRole: PaymentRole,
  shippingRoles: ShippingOptionRole[]
): boolean => allowedPaymentRolesFor(shippingRoles).includes(paymentRole)
