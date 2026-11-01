import { amountReadout, orderReadout } from "../readout"

/**
 * The readout of the live payment figures (commerce cards 0cca8305, 04b6010e). What must fail: a refund amount that
 * `Number()` turns into NaN passes unflagged (the BigNumber object a live module might return); a missing `refunds`
 * field is read as "no refunds"; the sums, or `covered` (never below zero), are wrong; the payment's `data` (the
 * Stripe client secret) or the order's metadata reaches the readout.
 */
const order = (payment: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: "order_1",
  total: 1000,
  metadata: { secret_note: "METADATA-NEM-KERULHET-KI" },
  payment_collections: [
    { id: "paycol_1", status: "authorized", payments: [{ id: "pay_1", provider_id: "pp_stripe", amount: 1000, data: { client_secret: "pi_x_secret_NEM-KERULHET-KI" }, captures: [], refunds: [], ...payment }] },
  ],
  ...extra,
})

describe("amountReadout", () => {
  it("says what an amount arrived as, and whether Number() takes it", () => {
    expect(amountReadout(1050)).toEqual({ type: "number", value: 1050, as_number: 1050, finite: true })
    expect(amountReadout("1050")).toMatchObject({ type: "string", as_number: 1050, finite: true })
    expect(amountReadout(null)).toMatchObject({ type: "null", as_number: 0, finite: true })
    // a BigNumber-like object: Number() of it is NaN (this is the case a live measurement must rule out)
    expect(amountReadout({ value: "1050", precision: 20 })).toMatchObject({ type: "object", finite: false })
    expect(amountReadout(undefined)).toMatchObject({ type: "undefined", finite: false })
  })
})

describe("orderReadout", () => {
  it("sums captures and refunds, and covered is captures minus refunds, never below zero", () => {
    const r = orderReadout(order({ captures: [{ amount: 600 }, { amount: 450 }], refunds: [{ amount: 150 }] })).collections[0]!.payments[0]!
    expect([r.captured_total, r.refunded_total, r.covered, r.refunds_field]).toEqual([1050, 150, 900, "present"])
    const over = orderReadout(order({ captures: [{ amount: 100 }], refunds: [{ amount: 250 }] })).collections[0]!.payments[0]!
    expect(over.covered).toBe(0)
  })

  it("tells a resolved empty `refunds` from a missing one, and flags the missing one", () => {
    const empty = orderReadout(order({ refunds: [] }))
    expect([empty.collections[0]!.payments[0]!.refunds_field, empty.findings]).toEqual(["empty", []])
    const raw = order({})
    delete (raw.payment_collections[0]!.payments[0] as any).refunds
    const missing = orderReadout(raw)
    expect(missing.collections[0]!.payments[0]!.refunds_field).toBe("missing")
    expect(missing.findings.join(" ")).toMatch(/no `refunds` key/)
  })

  it("flags a refund or a capture amount that Number() cannot read", () => {
    const r = orderReadout(order({ captures: [{ amount: { value: "500" } }], refunds: [{ amount: { value: "100" } }] }))
    expect(r.findings.length).toBe(2)
    expect(r.findings.join(" ")).toMatch(/refund amount is object/)
    expect(r.findings.join(" ")).toMatch(/capture amount is object/)
    expect(Number.isNaN(r.collections[0]!.payments[0]!.covered)).toBe(true)
  })

  it("never carries a payment's data or the order's metadata", () => {
    const text = JSON.stringify(orderReadout(order({ captures: [{ amount: 1000 }] })))
    expect(text).not.toContain("NEM-KERULHET-KI")
    expect(text).not.toContain("client_secret")
  })

  it("an order with no collections, or none at all, reads as empty, not as an error", () => {
    expect(orderReadout({ id: "order_2", total: 0, payment_collections: [] }).collections).toEqual([])
    expect(orderReadout(null).order_id).toBeNull()
  })
})
