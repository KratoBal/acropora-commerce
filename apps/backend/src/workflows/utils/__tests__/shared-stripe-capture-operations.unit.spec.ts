import { loadSide } from "../shared-stripe-capture-operations"

/**
 * WHICH PAYMENT IS THE ORDER'S (plan section 5: an order can carry the hold
 * and a difference paid through a link). What must fail: the paid difference
 * taken for the order's payment (Kiszállítás would read the order as captured
 * and never take the hold; an order edit would let Medusa cancel the hold);
 * the difference not reported as paid elsewhere; a canceled payment counted.
 */
const big = (value: number) => ({ valueOf: () => value })
const payment = (id: string, created_at: string, captured: number[], extra: Record<string, unknown> = {}) => ({
  id,
  provider_id: "pp_stripe_stripe",
  amount: big(id === "pay_hold" ? 14000 : 2500),
  data: { id: `pi_${id}` },
  canceled_at: null,
  created_at,
  captures: captured.map((amount) => ({ amount: big(amount) })),
  ...extra,
})
const sideWith = async (payments: unknown[][]) => {
  const container = {
    resolve: () => ({
      graph: async () => ({
        data: [
          {
            id: "order_1",
            total: big(16500),
            currency_code: "huf",
            metadata: null,
            payment_collections: payments.map((list, index) => ({ id: `col_${index}`, status: "authorized", payments: list })),
          },
        ],
      }),
    }),
  }
  return loadSide(container as never, "order_1")
}

describe("loadSide", () => {
  it("the hold, not the paid difference, whichever collection comes first", async () => {
    const holdPayment = payment("pay_hold", "2026-10-05T08:00:00.000Z", [])
    const paidDifference = payment("pay_diff", "2026-10-06T10:00:00.000Z", [2500])
    for (const order of [
      [[paidDifference], [holdPayment]],
      [[holdPayment], [paidDifference]],
    ]) {
      const side = await sideWith(order)
      expect(side?.payment).toMatchObject({ id: "pay_hold", amount: 14000, captured: 0 })
      expect(side?.other_captured).toBe(2500)
    }
  })

  /**
   * A paid difference handed back by hand must not count as paid (barracuda,
   * commerce #561). What must fail: `other_captured` ignoring the refunds (the
   * hold's capture would drop by money the customer got back); a refund larger
   * than the capture pushing it negative; the refunds read for the HOLD's own
   * payment changing how it is picked; the query not asking for the refunds.
   */
  it("other_captured is the captures minus the refunds booked on the paid difference", async () => {
    const holdPayment = payment("pay_hold", "2026-10-05T08:00:00.000Z", [])
    const refundedDifference = (refunds: number[]) =>
      payment("pay_diff", "2026-10-06T10:00:00.000Z", [2500], {
        refunds: refunds.map((amount) => ({ amount: big(amount) })),
      })

    expect((await sideWith([[holdPayment], [refundedDifference([])]]))?.other_captured).toBe(2500)
    expect((await sideWith([[holdPayment], [refundedDifference([1000])]]))?.other_captured).toBe(1500)
    expect((await sideWith([[holdPayment], [refundedDifference([1000, 1500])]]))?.other_captured).toBe(0)
    expect((await sideWith([[holdPayment], [refundedDifference([9999])]]))?.other_captured).toBe(0)
  })

  it("a refund on the hold's own payment does not change which payment is the hold", async () => {
    const holdPayment = payment("pay_hold", "2026-10-05T08:00:00.000Z", [], {
      refunds: [{ amount: big(500) }],
    })
    const side = await sideWith([[payment("pay_diff", "2026-10-06T10:00:00.000Z", [2500])], [holdPayment]])
    expect(side?.payment).toMatchObject({ id: "pay_hold", captured: 0 })
    expect(side?.other_captured).toBe(2500)
  })

  it("asks Medusa for the refunds' amounts", async () => {
    const graph = jest.fn(async () => ({ data: [{ id: "order_1", total: 0, currency_code: "huf", payment_collections: [] }] }))
    await loadSide({ resolve: () => ({ graph }) } as never, "order_1")
    const [{ fields }] = graph.mock.calls[0] as unknown as [{ fields: string[] }]
    expect(fields).toContain("payment_collections.payments.refunds.amount")
  })

  it("of two uncaptured payments the earlier (the hold, while a link's is being paid)", async () => {
    const side = await sideWith([
      [payment("pay_diff", "2026-10-06T10:00:00.000Z", [])],
      [payment("pay_hold", "2026-10-05T08:00:00.000Z", [])],
    ])
    expect(side?.payment?.id).toBe("pay_hold")
  })

  it("a captured order still reads its payment, and a canceled one counts nothing", async () => {
    const side = await sideWith([
      [payment("pay_hold", "2026-10-05T08:00:00.000Z", [14000])],
      [payment("pay_diff", "2026-10-06T10:00:00.000Z", [2500], { canceled_at: "2026-10-06T11:00:00.000Z" })],
    ])
    expect(side?.payment).toMatchObject({ id: "pay_hold", captured: 14000 })
    expect(side?.other_captured).toBe(0)
  })
})
