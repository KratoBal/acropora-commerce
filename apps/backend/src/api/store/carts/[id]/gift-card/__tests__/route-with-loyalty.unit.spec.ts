const created: unknown[] = []
jest.mock("@medusajs/medusa/core-flows", () => ({
  createCartCreditLinesWorkflow: () => ({ run: async () => void created.push(1) }),
  deleteCartCreditLinesWorkflow: () => ({ run: async () => undefined }),
  refreshPaymentCollectionForCartWorkflow: () => ({ run: async () => undefined }),
}))
jest.mock("../../../../../../workflows/utils/resolve-cart-shipping-class", () => ({
  resolveCartShippingClass: async () => ({ split_line_ids: [] }),
}))

import { POST } from "../route"

/**
 * A GIFT CARD DOES NOT SHARE A CART WITH POINTS (card dfb79916): two credit lines would each cap against the whole total.
 * What must fail: a gift card applied to a cart that carries a points credit; the refusal reaching the card lookup.
 */
const run = async (creditLines: unknown[]) => {
  const retrieve = jest.fn(async () => null)
  const res: any = {}
  res.status = (c: number) => ((res.statusCode = c), res)
  res.json = (b: unknown) => ((res.body = b), res)
  const cart = { id: "cart_1", completed_at: null, currency_code: "huf", total: 5_000, credit_line_total: 0, credit_lines: creditLines, items: [] }
  await POST(
    {
      params: { id: "cart_1" },
      validatedBody: { code: "ABCD" },
      scope: { resolve: (key: string) => (key === "query" ? { graph: async () => ({ data: [cart] }) } : { retrieveGiftCardByCode: retrieve }) },
    } as never,
    res
  )
  return { res, retrieve }
}

describe("POST /store/carts/:id/gift-card with points on the cart", () => {
  it("is refused, before the code is even looked up", async () => {
    const { res, retrieve } = await run([
      { id: "cl_p", amount: 500, reference: "loyalty_points", reference_id: "cus_1", metadata: { points: 500 } },
    ])
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("gift_card_with_loyalty")
    expect(retrieve).not.toHaveBeenCalled()
    expect(created).toEqual([])
  })

  it("without points the lookup goes on (the guard is the points only)", async () => {
    const { res, retrieve } = await run([])
    expect(retrieve).toHaveBeenCalledWith("ABCD")
    expect(res.statusCode).toBe(400)
  })
})
