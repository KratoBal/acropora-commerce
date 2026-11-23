import { GET as PAYOUTS } from "../payouts/route"
import { GET as TRANSACTIONS } from "../payouts/[payout_id]/transactions/route"
import * as payoutsModule from "../payouts/route"
import * as transactionsModule from "../payouts/[payout_id]/transactions/route"

const respond = () => {
  const sent: any[] = []
  return { sent, res: { json: (body: unknown) => void sent.push(body) } as any }
}

const stripeAnswer = (body: unknown, status = 200) =>
  jest.spyOn(global, "fetch").mockResolvedValue({ status, text: async () => JSON.stringify(body) } as never)

describe("the settlement feed routes", () => {
  const OLD_KEY = process.env.STRIPE_API_KEY
  beforeEach(() => {
    process.env.STRIPE_API_KEY = "sk_test_ZZZZ_not_a_real_key"
  })
  afterEach(() => {
    jest.restoreAllMocks()
    if (OLD_KEY === undefined) delete process.env.STRIPE_API_KEY
    else process.env.STRIPE_API_KEY = OLD_KEY
  })

  it("exports a GET and no other verb (the read-only condition)", () => {
    for (const mod of [payoutsModule, transactionsModule]) {
      const verbs = Object.keys(mod).filter((name) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(name))
      expect(verbs).toEqual(["GET"])
    }
  })

  it("payouts: asks Stripe with the query and answers the normalized page", async () => {
    const fetchMock = stripeAnswer({ has_more: false, data: [{ id: "po_1", status: "paid", currency: "huf", amount: 100, arrival_date: 5, created: 4, automatic: true }] })
    const { sent, res } = respond()
    await PAYOUTS({ query: { created_gte: "100", status: "paid" }, scope: {} } as any, res)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe("GET")
    expect(url).toContain("https://api.stripe.com/v1/payouts?")
    expect(url).toContain("created[gte]=100")
    expect(url).toContain("status=paid")
    expect(url).not.toContain("sk_test")
    expect(sent[0].payouts[0]).toMatchObject({ id: "po_1", amount: 1, amount_minor: 100 })
  })

  it("transactions: needs a payout id that looks like po_, and refuses anything else before calling Stripe", async () => {
    const fetchMock = stripeAnswer({ data: [] })
    for (const bad of ["", "pi_1", "po_1/cancel", "po_1?x=1", "../x"]) {
      await expect(TRANSACTIONS({ params: { payout_id: bad }, query: {}, scope: {} } as any, respond().res)).rejects.toThrow(/payout_id must look like po_/)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("transactions: expands the source and answers the intent", async () => {
    const fetchMock = stripeAnswer({ has_more: false, data: [{ id: "txn_1", type: "charge", currency: "huf", amount: 470000, fee: 21150, net: 448850, source: { object: "charge", id: "ch_1", payment_intent: "pi_1" } }] })
    const { sent, res } = respond()
    const graph = jest.fn(async () => ({ data: [{ id: "order_1", display_id: 72, total: 4700, currency_code: "huf", payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe", data: { id: "pi_1" } }] }] }] }))
    await TRANSACTIONS({ params: { payout_id: "po_1" }, query: {}, scope: { resolve: () => ({ graph }) } } as any, res)
    expect(graph).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain("balance_transactions?")
    expect(url).toContain("payout=po_1")
    expect(url).toContain("expand[]=data.source")
    expect(sent[0].transactions[0]).toMatchObject({ payment_intent: "pi_1", amount: 4700, fee: 211.5, net: 4488.5 })
    expect(sent[0].transactions[0].orders).toEqual([{ id: "order_1", display_id: 72, total: 4700, currency_code: "huf" }])
    expect(sent[0].orders_truncated).toBe(false)
  })

  it("a query that is not in the list is refused (strict)", async () => {
    stripeAnswer({ data: [] })
    await expect(PAYOUTS({ query: { created_gte: "1", surprise: "x" }, scope: {} } as any, respond().res)).rejects.toThrow(/Invalid stripe payouts query/)
    await expect(PAYOUTS({ query: { limit: "500" }, scope: {} } as any, respond().res)).rejects.toThrow(/Invalid stripe payouts query/)
    await expect(PAYOUTS({ query: { starting_after: "ch_1" }, scope: {} } as any, respond().res)).rejects.toThrow(/Invalid stripe payouts query/)
  })

  it("no key: nothing is read, and the answer says why", async () => {
    delete process.env.STRIPE_API_KEY
    const fetchMock = stripeAnswer({ data: [] })
    await expect(PAYOUTS({ query: {}, scope: {} } as any, respond().res)).rejects.toThrow(/STRIPE_API_KEY is not set/)
    await expect(TRANSACTIONS({ params: { payout_id: "po_1" }, query: {}, scope: {} } as any, respond().res)).rejects.toThrow(/STRIPE_API_KEY is not set/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
