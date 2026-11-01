/**
 * THE LIVE SHAPE OF AN ORDER'S PAYMENT FIGURES, for a person to read (commerce cards 0cca8305 and 04b6010e, acrobot 39608).
 *
 * `loadSide` sums `captures.amount` and, since #615, `refunds.amount` with `Number(...)`. It was written without a
 * running Medusa: whether `payment_collections.payments.refunds.amount` is a plain number, a string or a BigNumber
 * object on a live module (an object would make `Number(...)` NaN and every sum NaN) is not known from the code. This
 * turns the raw query answer into a readout that SAYS what each amount is (type, value, whether `Number()` takes it),
 * and flags what would make `loadSide` count wrongly. It reads, never writes, and never carries a payment's `data`
 * (the Stripe intent's client secret lives there) or the order's metadata.
 */
export type AmountReadout = { type: string; value: unknown; as_number: number; finite: boolean }

const typeOf = (value: unknown): string => (value === null ? "null" : Array.isArray(value) ? "array" : typeof value)

/** What an amount arrived as, and what `Number()` makes of it. */
export const amountReadout = (value: unknown): AmountReadout => {
  const asNumber = Number(value)
  return { type: typeOf(value), value: value ?? null, as_number: asNumber, finite: Number.isFinite(asNumber) }
}

export type PaymentReadout = {
  id: string | null
  provider_id: string | null
  canceled: boolean
  amount: AmountReadout
  captures: AmountReadout[]
  /** "missing": the answer has no `refunds` key at all (the field was not resolved); "empty": [] (resolved, none booked). */
  refunds_field: "missing" | "empty" | "present"
  refunds: AmountReadout[]
  captured_total: number
  refunded_total: number
  /** captures minus refunds, never below zero: what `loadSide` counts as paid. */
  covered: number
}

export type OrderReadout = {
  order_id: string | null
  total: AmountReadout
  collections: { id: string | null; status: string | null; payments: PaymentReadout[] }[]
  findings: string[]
}

const list = (value: unknown): any[] => (Array.isArray(value) ? value : [])
const sum = (values: AmountReadout[]) => values.reduce((total, v) => total + (v.finite ? v.as_number : Number.NaN), 0)

/** The readout of ONE order's raw `query.graph` answer (the fields of `ORDER_FIELDS`). */
export const orderReadout = (order: any): OrderReadout => {
  const findings: string[] = []
  const collections = list(order?.payment_collections).map((collection) => ({
    id: collection?.id ?? null,
    status: collection?.status ?? null,
    payments: list(collection?.payments)
      .filter(Boolean)
      .map((payment): PaymentReadout => {
        const captures = list(payment.captures).map((c) => amountReadout(c?.amount))
        const hasRefunds = payment && Object.prototype.hasOwnProperty.call(payment, "refunds") && payment.refunds !== undefined
        const refunds = list(payment.refunds).map((r) => amountReadout(r?.amount))
        const refundsField: PaymentReadout["refunds_field"] = !hasRefunds ? "missing" : refunds.length === 0 ? "empty" : "present"
        const capturedTotal = sum(captures)
        const refundedTotal = sum(refunds)
        const covered = Math.max(0, capturedTotal - refundedTotal)
        const id = payment.id ?? null
        if (refundsField === "missing") findings.push(`payment ${id}: the answer has no \`refunds\` key: the field is not resolved, loadSide would never subtract a refund`)
        for (const r of refunds) if (!r.finite) findings.push(`payment ${id}: a refund amount is ${r.type} ${JSON.stringify(r.value)}, Number() of it is NaN: loadSide would count NaN`)
        for (const c of captures) if (!c.finite) findings.push(`payment ${id}: a capture amount is ${c.type} ${JSON.stringify(c.value)}, Number() of it is NaN`)
        return {
          id,
          provider_id: payment.provider_id ?? null,
          canceled: !!payment.canceled_at,
          amount: amountReadout(payment.amount),
          captures,
          refunds_field: refundsField,
          refunds,
          captured_total: capturedTotal,
          refunded_total: refundedTotal,
          covered,
        }
      }),
  }))
  return { order_id: order?.id ?? null, total: amountReadout(order?.total), collections, findings }
}
