import { PAYMENT_ROLES, PaymentRole } from "./payment-eligibility"
import {
  SHIPPING_OPTION_ROLES,
  ShippingOptionRole,
} from "./shipping-eligibility"

/**
 * The stored form of "which payment methods may this shipping method use, and
 * in what order".
 *
 * One row per allowed pair. Absence is the denial - see the model comment for
 * why there is no `allowed` flag.
 */
export type ShippingPaymentRuleRow = {
  shipping_role: string
  payment_role: string
  position: number
}

const isShippingRole = (value: string): value is ShippingOptionRole =>
  (SHIPPING_OPTION_ROLES as readonly string[]).includes(value)

const isPaymentRole = (value: string): value is PaymentRole =>
  (PAYMENT_ROLES as readonly string[]).includes(value)

/**
 * Turns stored rows into the map the eligibility rules already speak.
 *
 * UNKNOWN ROLE NAMES ARE SKIPPED, NOT REJECTED, and the choice is deliberate
 * rather than lazy. A stored value can stop matching the code in one realistic
 * way: a role is renamed in a release while the rows still carry the old name.
 * Throwing there would take the whole checkout down for every customer because
 * one pair no longer resolves. Skipping loses that one pair, which shows up as
 * a payment method missing from a list someone is looking at.
 *
 * The louder failure is not the safer one here, and the drift that would cause
 * it is caught earlier anyway: `SHIPPING_PAYMENT_RULE_SEED` is asserted against
 * the code matrix in the unit tests, so a rename breaks the build, not the shop.
 */
export const toShippingRolePayments = (
  rows: ShippingPaymentRuleRow[],
): Record<ShippingOptionRole, PaymentRole[]> => {
  const byShippingRole = {} as Record<ShippingOptionRole, PaymentRole[]>

  for (const role of SHIPPING_OPTION_ROLES) {
    byShippingRole[role] = []
  }

  const ordered = [...rows].sort((a, b) => a.position - b.position)

  for (const row of ordered) {
    if (!isShippingRole(row.shipping_role)) continue
    if (!isPaymentRole(row.payment_role)) continue

    const list = byShippingRole[row.shipping_role]

    if (!list.includes(row.payment_role)) {
      list.push(row.payment_role)
    }
  }

  return byShippingRole
}

/**
 * The rows that reproduce today's behaviour exactly.
 *
 * This is the seed, not the runtime source: nothing reads the table yet. It
 * exists here, next to the code matrix, so the two are compared by a test
 * rather than by whoever remembers to look. When the table becomes the runtime
 * source, this constant is what the first migration inserts.
 *
 * The positions are the order the methods are offered in, per shipping method.
 * Card first, because it is the one every shipping method allows.
 *
 * THE HEAVY ROW GAINED CASH ON DELIVERY ON 2026-09-01 (Balázs, "Legyen
 * utánvét"), and the drift test is how this file learned about it: the code
 * matrix moved on a separate branch, and the assertion went red the moment the
 * two met. That is the whole reason the assertion exists, so it is worth
 * recording that it worked rather than quietly fixing the row.
 */
export const SHIPPING_PAYMENT_RULE_SEED: ShippingPaymentRuleRow[] = [
  { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 2 },
  { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 2 },
  { shipping_role: "GLS_HEAVY", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_HEAVY", payment_role: "COD", position: 2 },
  { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
]
