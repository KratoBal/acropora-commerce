import { ShippingClass } from "./compute-shipping-class"

/**
 * Which kind of shipping an option represents. Roles rather than option ids, so
 * the eligibility table is testable and does not carry environment-specific
 * identifiers. The concrete stage ids live in
 * `src/scripts/configure-shipping-rules.ts`.
 */
export const SHIPPING_OPTION_ROLES = [
  "PICKUP",
  "GLS_NORMAL",
  "GLS_HEAVY",
  "FOXPOST",
] as const

export type ShippingOptionRole = (typeof SHIPPING_OPTION_ROLES)[number]

/**
 * The single source of truth for eligibility. Read it as: this role is offered
 * for these cart shipping classes.
 */
export const ROLE_ELIGIBILITY: Record<ShippingOptionRole, ShippingClass[]> = {
  PICKUP: ["NORMAL", "NO_FOXPOST", "HEAVY", "PICKUP_ONLY"],
  GLS_NORMAL: ["NORMAL", "NO_FOXPOST"],
  GLS_HEAVY: ["HEAVY"],
  FOXPOST: ["NORMAL"],
}

export const isRoleAllowedFor = (
  role: ShippingOptionRole,
  shippingClass: ShippingClass
): boolean => ROLE_ELIGIBILITY[role].includes(shippingClass)

export const allowedRolesFor = (
  shippingClass: ShippingClass
): ShippingOptionRole[] =>
  SHIPPING_OPTION_ROLES.filter((role) => isRoleAllowedFor(role, shippingClass))

/** The rule attribute the hook writes into the shipping-option context. */
export const SHIPPING_CLASS_RULE_ATTRIBUTE = "shipping_class"

/**
 * The shipping-option rule that expresses a role's eligibility.
 *
 * `in` is the only operator that can accept several accepted values, and it is
 * safe here because the context value is a SCALAR string. Medusa stringifies the
 * context value before comparing (`@medusajs/fulfillment/dist/utils/utils.js`),
 * so an array-valued context would silently collapse into a comma-joined string;
 * the array must be on the RULE side, never on the context side.
 */
export const ruleForRole = (role: ShippingOptionRole) => ({
  attribute: SHIPPING_CLASS_RULE_ATTRIBUTE,
  operator: "in" as const,
  value: [...ROLE_ELIGIBILITY[role]],
})
