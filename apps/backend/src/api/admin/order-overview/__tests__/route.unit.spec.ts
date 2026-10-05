import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../modules/order-business-status"
import { GET } from "../route"

/**
 * THE OS LIST: ONE PAGE, NEWEST FIRST, WITH PLAIN NUMBERS. What must fail: the
 * page asked without the newest-first order or with other bounds than the
 * query's, money handed on as Medusa's big-number object instead of a number,
 * a page order's status missing, or a malformed query read as defaults.
 */
const money = (value: number) => ({ valueOf: () => value, toJSON: () => ({ value: String(value) }) })

function run(query: Record<string, unknown>) {
  const graphCalls: any[] = []
  const sent: any[] = []
  const req = {
    query,
    scope: {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.QUERY)
          return {
            graph: async (args: any) => {
              graphCalls.push(args)
              if (args.pagination)
                return {
                  data: [
                    {
                      id: "order_1",
                      customer_id: "cus_1",
                      display_id: 38,
                      created_at: new Date("2026-10-05T10:00:00Z"),
                      total: money(26390),
                      email: "emese@example.hu",
                      currency_code: "huf",
                      payment_collections: [
                        {
                          status: "authorized",
                          amount: money(26390),
                          captured_amount: money(0),
                          refunded_amount: money(0),
                          payments: [{ provider_id: "pp_stripe_stripe" }],
                        },
                      ],
                    },
                  ],
                  metadata: { count: 7 },
                }
              return { data: [{ id: "order_1", customer_id: "cus_1", display_id: 38, created_at: new Date(), total: money(26390), email: "x" }] }
            },
          }
        if (key === ORDER_BUSINESS_STATUS_MODULE)
          return {
            listOrderBusinessStatusModels: async () => [{ order_id: "order_1", status: "stocking" }],
            listOrderBusinessStatusHistories: async () => [
              { order_id: "order_1", to_status: "stocking", created_at: new Date("2026-10-05T11:00:00Z") },
            ],
          }
        throw new Error(`unexpected ${key}`)
      },
    },
  }
  const res = { json: (body: unknown) => void sent.push(body) }
  return { promise: GET(req as never, res as never), graphCalls, sent }
}

describe("GET /admin/order-overview", () => {
  it("asks one page newest first and answers with plain numbers and the status", async () => {
    const { promise, graphCalls, sent } = run({ limit: "20", offset: "40" })
    await promise
    expect(graphCalls[0].pagination).toEqual({ skip: 40, take: 20, order: { created_at: "DESC" } })
    const page = sent[0]
    expect([page.count, page.offset, page.limit]).toEqual([7, 40, 20])
    const [row] = page.orders
    expect([row.total, row.payment]).toEqual([
      26390,
      {
        provider_id: "pp_stripe_stripe",
        status: "authorized",
        amount: 26390,
        captured_amount: 0,
        refunded_amount: 0,
        // the fixture's payment has no creation time: no hold to expire
        hold_expires_at: null,
      },
    ])
    expect(row.business_status.code).toBe("stocking")
  })

  it("a malformed query is refused, not read as the defaults", async () => {
    for (const query of [{ limit: "0" }, { limit: "500" }, { offset: "-1" }, { status: "x" }]) {
      const { promise, sent } = run(query)
      await expect(promise).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
      expect(sent).toEqual([])
    }
  })
})
