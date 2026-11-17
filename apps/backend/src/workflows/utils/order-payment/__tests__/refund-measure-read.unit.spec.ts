import { intentIdOf, listMeasureOrders, readIntent, readOrderState, readStripeRefunds, sideOf } from "../refund-measure-read"

/**
 * THE READING PART OF THE REFUND MEASUREMENT (task t-20261117-visszaterites-segedo). What must fail: the intent id, a payment's `data`, the
 * order's metadata or the key reaching the printed state; a live Stripe answer read as test; Stripe's smallest-unit amount printed as forints
 * wrongly; a canceled or non-Stripe payment read as a live Stripe one; the list taking an order with nothing captured.
 */
const SECRET_INTENT = "pi_SECRET_INTENT_ID"
const KEY = "sk_test_abc123"

const order = (over: any = {}) => ({
  id: "order_01A",
  display_id: 7,
  created_at: "2026-11-17T10:00:00Z",
  total: 1000,
  currency_code: "huf",
  metadata: { buyer_note: "SECRET_METADATA" },
  payment_collections: [
    {
      id: "paycol_1",
      status: "completed",
      payments: [
        { id: "pay_01A", provider_id: "pp_stripe_stripe", amount: 1000, canceled_at: null, created_at: "2026-11-17T10:00:00Z", data: { id: SECRET_INTENT, client_secret: "SECRET_CLIENT" }, captures: [{ amount: 1000 }], refunds: [{ amount: 100 }] },
      ],
    },
  ],
  ...over,
})

const fakeContainer = (orders: any[]) => ({
  resolve: () => ({
    graph: async (args: any) => ({ data: args.filters?.id ? orders.filter((o) => o.id === args.filters.id) : orders }),
  }),
})

const stripeFetch = (map: Record<string, any>) =>
  jest.spyOn(globalThis, "fetch").mockImplementation((async (url: any) => {
    const path = String(url).replace("https://api.stripe.com/v1/", "")
    const hit = Object.entries(map).find(([prefix]) => path.startsWith(prefix))
    return { status: hit ? hit[1].status ?? 200 : 404, json: async () => (hit ? hit[1].body : null) }
  }) as any)

afterEach(() => jest.restoreAllMocks())

describe("intentIdOf and sideOf", () => {
  it("reads a string intent id and nothing else", () => {
    expect(intentIdOf({ data: { id: "pi_1" } })).toBe("pi_1")
    expect(intentIdOf({ data: { id: 5 } })).toBeNull()
    expect(intentIdOf({})).toBeNull()
    expect(intentIdOf(undefined)).toBeNull()
  })

  it("keeps four fields of loadSide and drops its metadata and its payment data", () => {
    const side: any = { order_id: "o", total: 1000, currency_code: "huf", metadata: { x: "SECRET" }, payment: { data: { id: "pi" } }, payment_canceled: false, other_captured: 0 }
    expect(sideOf(side)).toEqual({ total: 1000, currency_code: "huf", other_captured: 0, payment_canceled: false })
    expect(sideOf(null)).toBeNull()
  })
})

describe("readIntent and readStripeRefunds", () => {
  it("prints the intent's status and livemode, and says live when Stripe says live", async () => {
    stripeFetch({ "payment_intents/": { body: { status: "succeeded", livemode: true, amount: 1000, currency: "huf", amount_received: 1000 } } })
    const live = await readIntent(KEY, "pi_1")
    expect(live.live).toBe(true)
    expect(live.read).toMatchObject({ status: "succeeded", livemode: true })
    stripeFetch({ "payment_intents/": { body: { status: "succeeded", livemode: false } } })
    expect((await readIntent(KEY, "pi_1")).live).toBe(false)
  })

  it("an intent Stripe does not return is NOT read as test: live is null and the http status is printed", async () => {
    stripeFetch({ "payment_intents/": { status: 404, body: null } })
    expect(await readIntent(KEY, "pi_1")).toEqual({ live: null, read: { http_status: 404 } })
  })

  it("prints each refund's status and its amount in the smallest unit and in forints", async () => {
    stripeFetch({ "refunds?": { body: { data: [{ status: "succeeded", amount: 10000, currency: "huf" }] } } })
    const read = await readStripeRefunds(KEY, "pi_1", "huf")
    expect(read.http_status).toBe(200)
    expect(read.refunds).toEqual([{ status: "succeeded", amount_smallest_unit: 10000, amount: 100, currency: "huf" }])
  })
})

describe("listMeasureOrders", () => {
  it("lists only orders with a captured, live Stripe payment, newest first as asked, at most `limit`", async () => {
    const none = order({ id: "order_02", payment_collections: [{ id: "c", status: "x", payments: [{ id: "pay_02", provider_id: "pp_stripe_stripe", amount: 10, captures: [], refunds: [] }] }] })
    const manual = order({ id: "order_03", payment_collections: [{ id: "c", status: "x", payments: [{ id: "pay_03", provider_id: "pp_system_default", amount: 10, captures: [{ amount: 10 }], refunds: [] }] }] })
    const canceled = order({ id: "order_04", payment_collections: [{ id: "c", status: "x", payments: [{ id: "pay_04", provider_id: "pp_stripe_stripe", amount: 10, canceled_at: "2026-11-17", captures: [{ amount: 10 }], refunds: [] }] }] })
    const query = { graph: jest.fn(async () => ({ data: [none, manual, canceled, order(), order({ id: "order_05" })] })) }
    const rows = await listMeasureOrders(query, 1)
    expect(rows.map((r: any) => r.order_id)).toEqual(["order_01A"])
    expect(rows[0].payments[0]).toMatchObject({ payment_id: "pay_01A", captured: 1000, refunded: 100, refunds_field: "present" })
    expect((query.graph.mock.calls[0] as any)[0].pagination.order).toEqual({ created_at: "DESC" })
    expect(JSON.stringify(rows)).not.toContain("SECRET")
  })
})

describe("readOrderState", () => {
  it("returns the readout, loadSide's four fields and Stripe's intent and refunds per live Stripe payment, and carries no secret", async () => {
    stripeFetch({
      "payment_intents/": { body: { status: "succeeded", livemode: false, amount: 100000, currency: "huf", amount_received: 100000 } },
      "refunds?": { body: { data: [{ status: "succeeded", amount: 10000, currency: "huf" }] } },
    })
    const state: any = await readOrderState({ container: fakeContainer([order()]), key: KEY, orderId: "order_01A" })
    expect(state.order_id).toBe("order_01A")
    expect(state.readout.collections[0].payments[0].refunds_field).toBe("present")
    expect(state.side).toEqual({ total: 1000, currency_code: "huf", other_captured: 0, payment_canceled: false })
    expect(state.payments).toEqual([
      {
        payment_id: "pay_01A",
        stripe_intent: { status: "succeeded", livemode: false, amount: 100000, currency: "huf", amount_received: 100000 },
        stripe_refunds: { http_status: 200, refunds: [{ status: "succeeded", amount_smallest_unit: 10000, amount: 100, currency: "huf" }] },
      },
    ])
    const text = JSON.stringify(state)
    for (const secret of [SECRET_INTENT, "SECRET_CLIENT", "SECRET_METADATA", KEY]) expect(text).not.toContain(secret)
  })

  it("a canceled payment and a non-Stripe payment get no Stripe call and no row", async () => {
    const spy = stripeFetch({})
    const o = order({
      payment_collections: [
        { id: "c", status: "x", payments: [
          { id: "pay_x", provider_id: "pp_stripe_stripe", amount: 1, canceled_at: "2026-11-17", data: { id: SECRET_INTENT }, captures: [], refunds: [] },
          { id: "pay_y", provider_id: "pp_system_default", amount: 1, data: {}, captures: [], refunds: [] },
        ] },
      ],
    })
    const state: any = await readOrderState({ container: fakeContainer([o]), key: KEY, orderId: "order_01A" })
    expect(state.payments).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it("a live Stripe payment without an intent id has null Stripe fields and no Stripe call", async () => {
    const spy = stripeFetch({})
    const o = order()
    o.payment_collections[0].payments[0].data = {} as any
    const state: any = await readOrderState({ container: fakeContainer([o]), key: KEY, orderId: "order_01A" })
    expect(state.payments).toEqual([{ payment_id: "pay_01A", stripe_intent: null, stripe_refunds: null }])
    expect(spy).not.toHaveBeenCalled()
  })

  it("returns null for an order that does not exist", async () => {
    expect(await readOrderState({ container: fakeContainer([order()]), key: KEY, orderId: "order_99" })).toBeNull()
  })
})
