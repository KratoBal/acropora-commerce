/**
 * THE ORDER'S PAYMENT STATUS, AS MEDUSA COMPUTES IT (acrobot 60746, the guest order page). Medusa does not store an order's
 * `payment_status`: its order detail workflow computes it from the payment collections (`getLastPaymentStatus`,
 * `@medusajs/core-flows` 2.23.0, `dist/order/utils/aggregate-status.js`). The guest lookup reads the order through
 * `query.graph`, which has no such field, so the page got `null` for every order and its "Fizetésre vár" line never showed
 * (measured on the test shop 2026-11-24 15:36 UTC: the field present, its value null, on cash on delivery and bank transfer
 * orders alike). This is the same rule over the same collection fields, so the page says what the admin says.
 *
 * A copy, not an import: core-flows is not a direct dependency of the backend, and its `dist` path is no API. The rule is
 * short; the tests pin it to Medusa's order of checks.
 */
export type PaymentCollectionFacts = {
  status: string | null
  amount: number | null
  captured_amount: number | null
  refunded_amount: number | null
}

/** Half a unit of the smallest coin: forint has no decimals, so 0.5 (Medusa's `getEpsilonFromDecimalPrecision(0)`). */
const EPSILON = 0.5

export const orderPaymentStatus = (collections: readonly PaymentCollectionFacts[]): string => {
  const count: Record<string, number> = {}
  const add = (status: string, by = 1) => (count[status] = (count[status] ?? 0) + by)
  for (const collection of collections) {
    const amount = collection.amount
    const captured = collection.captured_amount ?? 0
    const refunded = collection.refunded_amount ?? 0
    if (captured > 0 || (amount !== null && amount === 0)) add("captured", (amount ?? 0) - captured <= EPSILON ? 1 : 0.5)
    if (refunded > 0) add("refunded", (amount ?? 0) - refunded <= EPSILON ? 1 : 0.5)
    if (collection.status) add(collection.status)
  }
  const total = collections.length
  const exceptCanceled = total - (count.canceled ?? 0)
  if ((count.requires_action ?? 0) > 0) return "requires_action"
  if ((count.refunded ?? 0) > 0) return count.refunded === count.captured ? "refunded" : "partially_refunded"
  if ((count.captured ?? 0) > 0) return count.captured === exceptCanceled ? "captured" : "partially_captured"
  if ((count.authorized ?? 0) > 0) return count.authorized === exceptCanceled ? "authorized" : "partially_authorized"
  if ((count.canceled ?? 0) > 0 && count.canceled === total) return "canceled"
  if ((count.awaiting ?? 0) > 0) return "awaiting"
  return "not_paid"
}
