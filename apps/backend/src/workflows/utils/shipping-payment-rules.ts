import { PAYMENT_ROLES, PaymentRole } from "./payment-eligibility"
import {
  SHIPPING_OPTION_ROLES,
  ShippingOptionRole,
} from "./shipping-eligibility"

/**
 * The payment methods each shipping method allows, in the order they are
 * offered. THE ONLY SOURCE of payment eligibility since card e0e2378b: the
 * checkout, the cash-on-delivery fee and an order's shipping change read it from
 * the `shipping_payment_rule` table (`loadShippingRolePayments`). The code matrix
 * that used to decide it (`SHIPPING_ROLE_PAYMENTS`) is gone.
 */
export type ShippingRolePayments = Record<ShippingOptionRole, PaymentRole[]>

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
): ShippingRolePayments => {
  const byShippingRole = {} as ShippingRolePayments

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
 * THE DECISIONS BEHIND THE ROWS, as they stood when the table took over from the
 * code matrix (card e0e2378b). The migration `Migration20261118220000` inserted
 * exactly these rows (a unit test holds the two equal); from then on the Admin
 * changes them, and this constant is the record of the starting point, not a
 * second source. Every row is a business decision, so each says whose it was:
 *
 * `PICKUP` (Balázs, 2026-08-31): card or paying in the shop. No cash on
 * delivery - there is no delivery to collect on.
 *
 * `GLS_NORMAL` (Balázs, 2026-08-31): card or cash on delivery. This role also
 * covers the GLS parcel point, not only home delivery.
 *
 * `GLS_HEAVY` (Balázs, 2026-09-01, "Legyen utánvét"): card or cash on delivery,
 * for both heavy options (home delivery and the heavy parcel point).
 *
 * `FOXPOST` (inherited from the original build, never separately confirmed):
 * card or cash on delivery.
 *
 * `BANK_TRANSFER` on EVERY shipping method (Balázs, 2026-10-06 16:31 UTC:
 * "Elore utalas kell. Leadja a rendelest es mi kuldjuk neki gombbal a
 * dijbekerot"; offered with every method on murena's proposal, approved by
 * acrobot 2026-10-06 18:34, card bb3a6bd5).
 *
 * The positions are the order the methods are offered in, per shipping method.
 * Card first, because it is the one every shipping method allows.
 */
export const SHIPPING_PAYMENT_RULE_SEED: ShippingPaymentRuleRow[] = [
  { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 2 },
  { shipping_role: "PICKUP", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 2 },
  { shipping_role: "GLS_NORMAL", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "GLS_HEAVY", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_HEAVY", payment_role: "COD", position: 2 },
  { shipping_role: "GLS_HEAVY", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
  { shipping_role: "FOXPOST", payment_role: "BANK_TRANSFER", position: 3 },
]

/** More than the matrix can ever hold (four shipping roles times four payment roles, one row per pair). */
export const SHIPPING_PAYMENT_RULE_READ_LIMIT = 1000

export type ShippingPaymentRuleReader = {
  listShippingPaymentRules: (
    filters: Record<string, never>,
    config: { take: number },
  ) => Promise<ShippingPaymentRuleRow[]>
}

/**
 * Reads the matrix from the table. THE `take` IS NOT OPTIONAL: a generated
 * `list...` method returns 15 rows when none is given, and the full matrix has
 * up to 16 - the sixteenth pair would vanish without an error.
 *
 * An empty table offers no payment method anywhere: that fails closed, and the
 * migration that took over from the code matrix filled it.
 */
export const loadShippingRolePayments = async (
  service: ShippingPaymentRuleReader,
): Promise<ShippingRolePayments> =>
  toShippingRolePayments(
    await service.listShippingPaymentRules(
      {},
      { take: SHIPPING_PAYMENT_RULE_READ_LIMIT },
    ),
  )
