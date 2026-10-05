import { adminCaptureOperations } from "../admin-capture-guard-operations"

/**
 * THE ADMIN CAPTURE'S ORDER TOTAL IS WHAT THE HOLD STILL OWES (plan section 5).
 * What must fail: a difference already paid through a link counted again, so
 * the guard asks the hold for the whole total (more than it holds, or the
 * difference charged twice).
 */
const big = (value: number) => ({ valueOf: () => value })
const graph = async ({ entity }: { entity: string }) => {
  if (entity === "payment") {
    return { data: [{ id: "pay_hold", provider_id: "pp_stripe_stripe", amount: big(14000), payment_collection_id: "col_hold", captures: [] }] }
  }
  if (entity === "payment_collection") return { data: [{ id: "col_hold", order: { id: "order_1" } }] }
  return {
    data: [
      {
        id: "order_1",
        total: big(16500),
        currency_code: "huf",
        metadata: null,
        payment_collections: [
          { id: "col_hold", status: "authorized", payments: [{ id: "pay_hold", provider_id: "pp_stripe_stripe", amount: big(14000), created_at: "2026-10-05T08:00:00.000Z", captures: [] }] },
          { id: "col_diff", status: "completed", payments: [{ id: "pay_diff", provider_id: "pp_stripe_stripe", amount: big(2500), created_at: "2026-10-06T10:00:00.000Z", captures: [{ amount: big(2500) }] }] },
        ],
      },
    ],
  }
}

describe("adminCaptureOperations", () => {
  it("the order's total less the difference paid through a link", async () => {
    const facts = await adminCaptureOperations({ resolve: () => ({ graph }) } as never).load("pay_hold")
    expect(facts).toEqual({ provider_id: "pp_stripe_stripe", amount: 14000, captured: 0, order: { id: "order_1", total: 14000 } })
  })
})
