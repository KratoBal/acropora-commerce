import { attachOrders, intentOfPayment, ordersByIntent, ORDER_LOOKBACK_DAYS, ORDER_SCAN_CAP } from "../orders"

const stripePayment = (data: unknown) => ({ provider_id: "pp_stripe_stripe", data })
const order = (id: string, display_id: number | null, total: number, payments: unknown[]) => ({
  id,
  display_id,
  total,
  currency_code: "HUF",
  created_at: "2026-11-01T00:00:00.000Z",
  payment_collections: [{ payments }],
})

const fakeQuery = (pages: unknown[][]) => {
  const calls: any[] = []
  return {
    calls,
    graph: async (input: any) => {
      calls.push(input)
      return { data: pages[calls.length - 1] ?? [] }
    },
  }
}

describe("intentOfPayment", () => {
  it("a plain card payment: data.id", () => {
    expect(intentOfPayment(stripePayment({ id: "pi_1" }))).toBe("pi_1")
  })
  it("a mixed cart's shared payment: the share's transaction id, on both carts", () => {
    expect(intentOfPayment(stripePayment({ stripe_share: { transactionId: "pi_9", total: 10, own: 4 } }))).toBe("pi_9")
    expect(intentOfPayment(stripePayment({ id: "pi_other", stripe_share: { transactionId: "pi_9", total: 10, own: 6, joined: true } }))).toBe("pi_9")
  })
  it("not a Stripe payment, or no intent: null", () => {
    expect(intentOfPayment({ provider_id: "pp_acropora_cod", data: { id: "pi_1" } })).toBeNull()
    expect(intentOfPayment(stripePayment({ id: "cs_1" }))).toBeNull()
    expect(intentOfPayment(stripePayment(null))).toBeNull()
    expect(intentOfPayment(null)).toBeNull()
  })
})

describe("ordersByIntent", () => {
  it("pairs an intent to its order, with the Medusa total in major units", async () => {
    const query = fakeQuery([[order("order_1", 72, 4700, [stripePayment({ id: "pi_A" })]), order("order_2", 73, 5150, [{ provider_id: "pp_acropora_cod", data: {} }])]])
    const { orders, truncated } = await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)
    expect(orders.get("pi_A")).toEqual([{ id: "order_1", display_id: 72, total: 4700, currency_code: "huf" }])
    expect(orders.size).toBe(1)
    expect(truncated).toBe(false)
  })

  it("a mixed cart: two orders for one intent are both returned", async () => {
    const share = { stripe_share: { transactionId: "pi_M", total: 9000, own: 5000 } }
    const query = fakeQuery([[order("order_s", 80, 5000, [stripePayment(share)]), order("order_p", 81, 4000, [stripePayment({ stripe_share: { ...share.stripe_share, own: 4000, joined: true } })])]])
    const { orders } = await ordersByIntent(query, new Set(["pi_M"]), 1_800_000_000)
    expect(orders.get("pi_M")?.map((o) => o.display_id)).toEqual([80, 81])
  })

  it("an order with two payments of the same intent counts once", async () => {
    const query = fakeQuery([[order("order_1", 1, 10, [stripePayment({ id: "pi_A" }), stripePayment({ id: "pi_A" })])]])
    expect((await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)).orders.get("pi_A")).toHaveLength(1)
  })

  it("an intent nobody asked for is not collected", async () => {
    const query = fakeQuery([[order("order_1", 1, 10, [stripePayment({ id: "pi_B" })])]])
    expect((await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)).orders.size).toBe(0)
  })

  it("reads orders from well before the earliest transaction (the hold), oldest first", async () => {
    const query = fakeQuery([[]])
    await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)
    const since = new Date(1_800_000_000 * 1000 - ORDER_LOOKBACK_DAYS * 86_400_000).toISOString()
    expect(query.calls[0]).toMatchObject({ entity: "order", filters: { created_at: { $gte: since } }, pagination: { skip: 0, take: 200, order: { created_at: "ASC" } } })
  })

  it("nothing wanted: no query at all", async () => {
    const query = fakeQuery([])
    expect((await ordersByIntent(query, new Set(), 1)).orders.size).toBe(0)
    expect(query.calls).toHaveLength(0)
  })

  it("pages on while a page is full, and stops at a short one", async () => {
    const full = Array.from({ length: 200 }, (_, i) => order(`o${i}`, i, 1, []))
    const query = fakeQuery([full, [order("late", 999, 5, [stripePayment({ id: "pi_A" })])]])
    const { orders, truncated } = await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)
    expect(query.calls.map((c) => c.pagination.skip)).toEqual([0, 200])
    expect(orders.get("pi_A")?.[0].display_id).toBe(999)
    expect(truncated).toBe(false)
  })

  it("past the cap it stops and says it was cut", async () => {
    const full = Array.from({ length: 200 }, (_, i) => order(`o${i}`, i, 1, []))
    const query = fakeQuery(Array.from({ length: ORDER_SCAN_CAP / 200 + 2 }, () => full))
    const { truncated } = await ordersByIntent(query, new Set(["pi_A"]), 1_800_000_000)
    expect(truncated).toBe(true)
    expect(query.calls).toHaveLength(ORDER_SCAN_CAP / 200)
  })
})

describe("attachOrders", () => {
  it("every transaction gets an orders list; no intent or no match is an empty list, never a guess", async () => {
    const query = fakeQuery([[order("order_1", 72, 4700, [stripePayment({ id: "pi_A" })])]])
    const page = { has_more: false, next_cursor: "txn_3", transactions: [
      { id: "txn_1", payment_intent: "pi_A", created: 1_800_000_000 },
      { id: "txn_2", payment_intent: "pi_Z", created: 1_800_000_100 },
      { id: "txn_3", payment_intent: null, created: 1_800_000_200 },
    ] }
    const answer = await attachOrders(query, page)
    expect(answer.transactions.map((t) => t.orders.map((o) => o.display_id))).toEqual([[72], [], []])
    expect(answer.next_cursor).toBe("txn_3")
    expect(answer.orders_truncated).toBe(false)
    // the window starts from the EARLIEST transaction
    expect(query.calls[0].filters.created_at.$gte).toBe(new Date(1_800_000_000 * 1000 - ORDER_LOOKBACK_DAYS * 86_400_000).toISOString())
  })

  it("a page with no intent reads no orders", async () => {
    const query = fakeQuery([])
    const answer = await attachOrders(query, { transactions: [{ payment_intent: null, created: 5 }] })
    expect(query.calls).toHaveLength(0)
    expect(answer.transactions[0].orders).toEqual([])
  })
})
