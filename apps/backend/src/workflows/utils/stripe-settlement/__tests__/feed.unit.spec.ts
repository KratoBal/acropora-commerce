import { MedusaError } from "@medusajs/framework/utils"

import { listPayoutTransactions, listPayouts, majorUnit, payoutView, transactionView } from "../feed"
import type { StripeReader } from "../reader"

const reader = (response: { status: number; body: any }) => {
  const calls: { path: string; query: any }[] = []
  const read: StripeReader = async (path, query) => {
    calls.push({ path, query })
    return response
  }
  return { calls, read }
}

describe("amounts", () => {
  it("HUF is two-decimal at Stripe: 100 000 is 1 000 Ft", () => {
    expect(majorUnit(100000, "huf")).toBe(1000)
    expect(majorUnit(470000, "HUF")).toBe(4700)
  })
  it("zero- and three-decimal currencies", () => {
    expect(majorUnit(500, "jpy")).toBe(500)
    expect(majorUnit(1234, "kwd")).toBe(1.234)
  })
})

describe("transactionView pairs a balance transaction to its PaymentIntent", () => {
  const base = { id: "txn_1", type: "charge", reporting_category: "charge", created: 10, available_on: 20, currency: "huf", amount: 470000, fee: 21150, net: 448850, status: "available" }

  it("a charge: the expanded source gives the intent and the charge", () => {
    const view = transactionView({ ...base, source: { object: "charge", id: "ch_1", payment_intent: "pi_1", billing_details: { name: "Teszt" } } })
    expect(view).toMatchObject({ source_kind: "charge", source_id: "ch_1", charge: "ch_1", payment_intent: "pi_1", refund: null })
    expect(view.amount).toBe(4700)
    expect(view.fee).toBe(211.5)
    expect(view.net).toBe(4488.5)
  })

  it("a refund: the intent, the charge and the refund", () => {
    const view = transactionView({
      ...base,
      type: "refund",
      amount: -100000,
      fee: 0,
      net: -100000,
      source: { object: "refund", id: "re_1", payment_intent: "pi_1", charge: "ch_1" },
    })
    expect(view).toMatchObject({ source_kind: "refund", charge: "ch_1", payment_intent: "pi_1", refund: "re_1", amount: -1000 })
  })

  it("an intent that is itself an object is read by its id", () => {
    expect(transactionView({ ...base, source: { object: "charge", id: "ch_1", payment_intent: { id: "pi_9", object: "payment_intent" } } }).payment_intent).toBe("pi_9")
  })

  it("a source that is only an id (not expanded) pairs to nothing, and says so", () => {
    const view = transactionView({ ...base, source: "ch_1" })
    expect(view).toMatchObject({ source_kind: null, source_id: "ch_1", payment_intent: null, charge: null })
  })

  it("a fee line or a payout carries no intent", () => {
    expect(transactionView({ ...base, type: "stripe_fee", source: { object: "fee", id: "fee_1" } })).toMatchObject({ payment_intent: null, source_kind: "fee" })
  })

  it("never carries personal data", () => {
    const text = JSON.stringify(
      transactionView({
        ...base,
        description: "Teszt Elek statement",
        source: { object: "charge", id: "ch_1", payment_intent: "pi_1", billing_details: { name: "Teszt Elek", email: "t@example.com" }, metadata: { a: "b" } },
      }),
    )
    expect(text).not.toMatch(/Teszt Elek|example\.com|statement|billing/)
  })
})

describe("payoutView", () => {
  it("keeps the ids and figures only", () => {
    expect(payoutView({ id: "po_1", status: "paid", currency: "huf", amount: 4488500, arrival_date: 99, created: 50, automatic: true, type: "bank_account", method: "standard", description: "STRIPE PAYOUT", destination: "ba_1" })).toEqual({
      id: "po_1",
      status: "paid",
      currency: "huf",
      amount_minor: 4488500,
      amount: 44885,
      arrival_date: 99,
      created: 50,
      automatic: true,
      type: "bank_account",
      method: "standard",
    })
  })
})

describe("the two lists", () => {
  it("payouts: the query Stripe expects, and the cursor", async () => {
    const { calls, read } = reader({ status: 200, body: { has_more: true, data: [{ id: "po_2", amount: 100, currency: "huf" }, { id: "po_1", amount: 200, currency: "huf" }] } })
    const page = await listPayouts(read, { createdGte: 1000, status: "paid", startingAfter: "po_3", limit: 50 })
    expect(calls).toEqual([{ path: "payouts", query: { limit: 50, created: { gte: 1000 }, status: "paid", starting_after: "po_3" } }])
    expect(page.has_more).toBe(true)
    expect(page.next_cursor).toBe("po_1")
    expect(page.payouts.map((p) => p.id)).toEqual(["po_2", "po_1"])
  })

  it("payout transactions: filtered by the payout, the source expanded", async () => {
    const { calls, read } = reader({ status: 200, body: { has_more: false, data: [{ id: "txn_1", type: "charge", currency: "huf", amount: 100, fee: 5, net: 95, source: { object: "charge", id: "ch_1", payment_intent: "pi_1" } }] } })
    const page = await listPayoutTransactions(read, { payoutId: "po_1", limit: 100 })
    expect(calls).toEqual([{ path: "balance_transactions", query: { payout: "po_1", limit: 100, expand: ["data.source"] } }])
    expect(page.transactions[0].payment_intent).toBe("pi_1")
    expect(page.next_cursor).toBe("txn_1")
  })

  it("an empty page has no cursor", async () => {
    const { read } = reader({ status: 200, body: { has_more: false, data: [] } })
    expect(await listPayouts(read, { limit: 5 })).toEqual({ payouts: [], has_more: false, next_cursor: null })
  })
})

describe("a Stripe refusal", () => {
  const body = { error: { type: "invalid_request_error", code: "api_key_invalid", message: "Invalid API Key provided: sk_test_****abcd" } }

  it("names the status, the type and the code, and NOT Stripe's text (it can quote the key)", async () => {
    const { read } = reader({ status: 401, body })
    const error = await listPayouts(read, { limit: 5 }).catch((e: MedusaError) => e)
    expect(error).toBeInstanceOf(MedusaError)
    expect((error as MedusaError).message).toContain("HTTP 401")
    expect((error as MedusaError).message).toContain("invalid_request_error/api_key_invalid")
    expect((error as MedusaError).message).not.toContain("sk_test")
  })

  it.each([
    [404, MedusaError.Types.NOT_FOUND],
    [400, MedusaError.Types.INVALID_DATA],
    [429, MedusaError.Types.UNEXPECTED_STATE],
    [500, MedusaError.Types.UNEXPECTED_STATE],
  ])("HTTP %s becomes %s", async (status, type) => {
    const { read } = reader({ status, body })
    const error = await listPayoutTransactions(read, { payoutId: "po_1", limit: 5 }).catch((e: MedusaError) => e)
    expect((error as MedusaError).type).toBe(type)
  })
})
