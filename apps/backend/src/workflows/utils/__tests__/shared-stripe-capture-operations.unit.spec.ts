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
