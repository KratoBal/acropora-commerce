import { MedusaError } from "@medusajs/framework/utils"

import { GET } from "../route"

/**
 * THE READ-ONLY REFUND MEASUREMENT ROUTE (task t-20261117-visszaterites-segedo). What must fail: an answer on a backend whose Stripe key is not
 * a test key, a query read as defaults when malformed (an extra key, a bad order id, a limit out of range), a missing order answered as an
 * empty state, a secret in the answer, any write.
 */
const KEY = "sk_test_abc123"
const SECRET_INTENT = "pi_SECRET_INTENT_ID"

const order = {
  id: "order_01A",
  display_id: 7,
  created_at: "2026-11-17T10:00:00Z",
  total: 1000,
  currency_code: "huf",
  metadata: { buyer_note: "SECRET_METADATA" },
  payment_collections: [
    { id: "paycol_1", status: "completed", payments: [{ id: "pay_01A", provider_id: "pp_stripe_stripe", amount: 1000, data: { id: SECRET_INTENT }, captures: [{ amount: 1000 }], refunds: [{ amount: 100 }] }] },
  ],
}

const run = async (query: Record<string, unknown>, orders: any[] = [order]) => {
  const graphCalls: any[] = []
  const sent: any[] = []
  const req: any = {
    query,
    scope: { resolve: () => ({ graph: async (args: any) => { graphCalls.push(args); return { data: args.filters?.id ? orders.filter((o) => o.id === args.filters.id) : orders } } }) },
  }
  const res: any = { json: (body: any) => sent.push(body) }
  await GET(req, res)
  return { sent, graphCalls }
}

const originalKey = process.env.STRIPE_API_KEY
beforeEach(() => {
  process.env.STRIPE_API_KEY = KEY
  jest.spyOn(globalThis, "fetch").mockImplementation((async (url: any) => {
    const path = String(url)
    return path.includes("payment_intents/")
      ? { status: 200, json: async () => ({ status: "succeeded", livemode: false, amount: 100000, currency: "huf", amount_received: 100000 }) }
      : { status: 200, json: async () => ({ data: [{ status: "succeeded", amount: 10000, currency: "huf" }] }) }
  }) as any)
})
afterEach(() => {
  if (originalKey === undefined) delete process.env.STRIPE_API_KEY
  else process.env.STRIPE_API_KEY = originalKey
  jest.restoreAllMocks()
})

describe("GET /admin/refund-measure", () => {
  it("without an order id: the list section, newest first, with the test key flag", async () => {
    const { sent, graphCalls } = await run({})
    expect(sent[0].sections).toHaveLength(1)
    expect(sent[0].sections[0]).toMatchObject({ section: "list", value: { test_key: true } })
    expect(sent[0].sections[0].value.orders[0].order_id).toBe("order_01A")
    expect(graphCalls[0].pagination.order).toEqual({ created_at: "DESC" })
  })

  it("passes the limit on: at most `limit` rows", async () => {
    const second = { ...order, id: "order_02B" }
    const { sent } = await run({ limit: "1" }, [order, second])
    expect(sent[0].sections[0].value.orders.map((o: any) => o.order_id)).toEqual(["order_01A"])
    const both = await run({ limit: "2" }, [order, second])
    expect(both.sent[0].sections[0].value.orders).toHaveLength(2)
  })

  it("with an order id: the state section with the readout, loadSide's fields and Stripe's word; no secret in it", async () => {
    const { sent } = await run({ order_id: "order_01A" })
    const value = sent[0].sections[0].value
    expect(sent[0].sections[0].section).toBe("state")
    expect(value.readout.collections[0].payments[0].refunds_field).toBe("present")
    expect(value.payments[0].stripe_refunds.refunds[0].amount).toBe(100)
    const text = JSON.stringify(sent[0])
    for (const secret of [SECRET_INTENT, "SECRET_METADATA", KEY]) expect(text).not.toContain(secret)
  })

  it("an order that does not exist is NOT_FOUND, not an empty state", async () => {
    await expect(run({ order_id: "order_99" })).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })

  it("refuses unless the key is a Stripe TEST key, before it reads anything", async () => {
    for (const key of ["sk_live_abc123", "rk_live_abc123", "", undefined]) {
      if (key === undefined) delete process.env.STRIPE_API_KEY
      else process.env.STRIPE_API_KEY = key
      const graph = jest.fn()
      const req: any = { query: { order_id: "order_01A" }, scope: { resolve: () => ({ graph }) } }
      await expect(GET(req, { json: jest.fn() } as any)).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
      expect(graph).not.toHaveBeenCalled()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    }
  })

  it("a malformed query is refused, never read as defaults", async () => {
    for (const query of [{ order_id: "ord" }, { order_id: "order_01A", extra: "1" }, { limit: "0" }, { limit: "21" }, { limit: "x" }])
      await expect(run(query)).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })
})
