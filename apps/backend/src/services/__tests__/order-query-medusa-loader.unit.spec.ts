import { medusaOrderQueryLoader } from "../order-query-medusa-loader"
import { projectOrderQueryRows } from "../order-query-projection"

/**
 * THE LIST'S PAYMENT FACTS FROM MEDUSA. Money comes back as big-number
 * objects; the hold's expiry needs the payments' own amount, creation and
 * captures. What must fail: a payment field missing from the query (the
 * expiry would be null for every order), or a capture's big number left as an
 * object (a captured order would still show a hold).
 */
const big = (value: number) => ({ valueOf: () => value })

describe("medusaOrderQueryLoader", () => {
  it("asks for the payments' facts and hands them over as numbers", async () => {
    const graph = jest.fn(async (_input: { fields: string[] }) => ({
      data: [
        {
          id: "order_1",
          total: big(1000),
          metadata: null,
          payment_collections: [
            {
              status: "authorized",
              amount: big(1000),
              payments: [
                {
                  provider_id: "pp_stripe_stripe",
                  amount: big(1000),
                  created_at: "2026-10-05T08:00:00.000Z",
                  captures: [{ amount: big(900) }],
                },
              ],
            },
          ],
        },
      ],
      metadata: { count: 1 },
    }))
    const scope = { resolve: (key: string) => (key === "query" ? { graph } : {}) }
    const { orders } = await medusaOrderQueryLoader(scope as never, { limit: 20, offset: 0 }).loadPage()

    expect(graph.mock.calls[0][0].fields).toEqual(
      expect.arrayContaining([
        "payment_collections.payments.amount",
        "payment_collections.payments.created_at",
        "payment_collections.payments.canceled_at",
        "payment_collections.payments.captures.amount",
      ])
    )
    const payment = (orders[0] as any).payment_collections[0].payments[0]
    expect(payment.amount).toBe(1000)
    expect(payment.captures).toEqual([{ amount: 900 }])
    // captured: no hold left to expire
    expect(
      projectOrderQueryRows({ pageOrders: orders as never, customerOrders: [], statuses: [], history: [] })[0].payment
        ?.hold_expires_at
    ).toBeNull()
  })
})
