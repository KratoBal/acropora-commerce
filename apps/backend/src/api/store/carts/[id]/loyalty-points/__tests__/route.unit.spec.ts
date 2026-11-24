const created: any[] = []
const deleted: any[] = []
const refreshed: any[] = []
jest.mock("@medusajs/medusa/core-flows", () => ({
  createCartCreditLinesWorkflow: () => ({ run: async ({ input }: any) => void created.push(...input) }),
  deleteCartCreditLinesWorkflow: () => ({ run: async ({ input }: any) => void deleted.push(...input.id) }),
  refreshPaymentCollectionForCartWorkflow: () => ({ run: async ({ input }: any) => void refreshed.push(input.cart_id) }),
}))
const shipping = { split_line_ids: [] as string[] }
jest.mock("../../../../../../workflows/utils/resolve-cart-shipping-class", () => ({
  resolveCartShippingClass: async () => shipping,
}))

import { DELETE, GET, POST } from "../route"

/**
 * THE POINTS ON A CART (card dfb79916). What must fail: points applied while the redemption is off, to a guest, to
 * another customer's cart (answered like a missing cart), to a completed or mixed cart, next to a gift card, under the
 * order minimum, or with no usable balance; the amount not being the points at the point value; the credit not naming the
 * customer (the completion checks the owner against the cart's); more points than the cart takes or the balance holds;
 * fewer than the minimum; a replacement leaving the first credit; a DELETE leaving the credit; a refresh forgotten.
 */
const cartRow = (over: Record<string, unknown> = {}) => ({
  id: "cart_1",
  customer_id: "cus_1",
  completed_at: null,
  total: 50_000,
  credit_line_total: 0,
  credit_lines: [],
  items: [],
  ...over,
})
const run = async (
  handler: any,
  opts: { actor?: string | null; cart?: any; balance?: number; body?: any; settingRows?: { key: string; value: unknown }[] } = {}
) => {
  const cart = "cart" in opts ? opts.cart : cartRow()
  const res: any = { statusCode: 200, body: undefined }
  res.status = (c: number) => ((res.statusCode = c), res)
  res.json = (b: unknown) => ((res.body = b), res)
  const req: any = {
    params: { id: "cart_1" },
    validatedBody: opts.body ?? {},
    auth_context: "actor" in opts ? (opts.actor ? { actor_id: opts.actor } : undefined) : { actor_id: "cus_1" },
    scope: {
      resolve: (key: string) =>
        key === "query"
          ? { graph: async () => ({ data: cart ? [cart] : [] }) }
          : key === "commerce_settings"
            ? { listCommerceSettings: async () => opts.settingRows ?? [] }
            : { balanceOf: async () => opts.balance ?? 20_000 },
    },
  }
  await handler(req, res)
  return res
}
const gift = { id: "cl_g", amount: 500, reference: "gift_card", reference_id: "gc", metadata: {} }
const points = (n: number, id = "cl_p") => ({ id, amount: n, reference: "loyalty_points", reference_id: "cus_1", metadata: { points: n } })

beforeEach(() => {
  created.length = 0
  deleted.length = 0
  refreshed.length = 0
  shipping.split_line_ids = []
  process.env.LOYALTY_REDEMPTION_ENABLED = "true"
  for (const k of ["LOYALTY_POINT_VALUE_HUF", "LOYALTY_MIN_ORDER_HUF", "LOYALTY_MIN_POINTS", "LOYALTY_MAX_PERCENT"]) delete process.env[k]
})
afterAll(() => {
  delete process.env.LOYALTY_REDEMPTION_ENABLED
})

describe("POST /store/carts/:id/loyalty-points", () => {
  it("applies as many points as the cart takes when none are named, as a credit line naming the customer", async () => {
    const res = await run(POST, { balance: 20_000 })
    expect(res.statusCode).toBe(200)
    expect(created).toEqual([
      { cart_id: "cart_1", amount: 20_000, reference: "loyalty_points", reference_id: "cus_1", metadata: { points: 20_000, cart_id: "cart_1" } },
    ])
    expect(refreshed).toEqual(["cart_1"])
    expect(res.body.loyalty).toMatchObject({ enabled: true, balance: 20_000, min_points: 100, min_order: 30_000, point_value: 1 })
  })

  it("covers the shipping too: the whole total, not the items", async () => {
    // 50 000 pays everything the cart owes, shipping and the cash-on-delivery fee included
    const res = await run(POST, { balance: 80_000 })
    expect(res.statusCode).toBe(200)
    expect(created[0].amount).toBe(50_000)
  })

  it("lowers a request above the balance or the cart's share to what is allowed", async () => {
    await run(POST, { balance: 3_000, body: { points: 9_000 } })
    expect(created[0].amount).toBe(3_000)
    created.length = 0
    process.env.LOYALTY_MAX_PERCENT = "40"
    await run(POST, { balance: 99_999, body: { points: 49_000 } })
    expect(created[0].amount).toBe(20_000)
  })

  it("refuses fewer points than the minimum", async () => {
    const res = await run(POST, { balance: 5_000, body: { points: 99 } })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe("loyalty_under_minimum")
    expect(created).toEqual([])
  })

  it("replaces an earlier points credit instead of adding a second", async () => {
    await run(POST, { cart: cartRow({ total: 40_000, credit_line_total: 10_000, credit_lines: [points(10_000)] }), balance: 20_000 })
    expect(deleted).toEqual(["cl_p"])
    expect(created).toHaveLength(1)
    // the 10 000 already credited are part of what the cart pays before credits
    expect(created[0].amount).toBe(20_000)
  })

  it("is off until switched on", async () => {
    process.env.LOYALTY_REDEMPTION_ENABLED = "false"
    const res = await run(POST)
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("loyalty_off")
    expect(created).toEqual([])
  })

  // THE SETTINGS ARE THE ADMIN'S (card dfb79916; Balázs 2026-11-24): a stored row beats the environment
  it("a stored switch beats the environment: on while the environment says off, off while it says on", async () => {
    process.env.LOYALTY_REDEMPTION_ENABLED = "false"
    const on = await run(POST, { balance: 20_000, settingRows: [{ key: "loyalty_redemption_enabled", value: "1" }] })
    expect(on.statusCode).toBe(200)
    expect(created).toHaveLength(1)
    created.length = 0
    process.env.LOYALTY_REDEMPTION_ENABLED = "true"
    const off = await run(POST, { settingRows: [{ key: "loyalty_redemption_enabled", value: "0" }] })
    expect(off.statusCode).toBe(409)
    expect(off.body.code).toBe("loyalty_off")
    expect(created).toEqual([])
  })

  it("stored numbers rule the cart: the order minimum, the share and the point value", async () => {
    const minimum = await run(POST, { cart: cartRow({ total: 50_000 }), balance: 20_000, settingRows: [{ key: "loyalty_min_order_huf", value: "60000" }] })
    expect([minimum.statusCode, minimum.body.code]).toEqual([409, "loyalty_under_minimum"])
    const share = await run(POST, { balance: 99_999, settingRows: [{ key: "loyalty_max_percent", value: "40" }] })
    expect(share.statusCode).toBe(200)
    expect(created[0].amount).toBe(20_000)
    created.length = 0
    await run(POST, { balance: 7_000, body: { points: 5_000 }, settingRows: [{ key: "loyalty_point_value_huf", value: "3" }] })
    expect(created[0]).toMatchObject({ amount: 15_000, metadata: { points: 5_000 } })
  })

  it("a stored row that fails its bounds does not stop the checkout: the environment answers", async () => {
    const res = await run(POST, { balance: 20_000, settingRows: [{ key: "loyalty_max_percent", value: "250" }] })
    expect(res.statusCode).toBe(200)
    expect(created[0].amount).toBe(20_000)
  })

  it("a guest cannot", async () => {
    const res = await run(POST, { actor: null })
    expect(res.statusCode).toBe(401)
    expect(created).toEqual([])
  })

  it("another customer's cart answers like a missing one", async () => {
    const res = await run(POST, { cart: cartRow({ customer_id: "cus_other" }) })
    expect(res.statusCode).toBe(404)
    const none = await run(POST, { cart: null })
    expect(none.statusCode).toBe(404)
    expect(created).toEqual([])
  })

  it("a cart that is already an order takes nothing", async () => {
    const res = await run(POST, { cart: cartRow({ completed_at: "2026-11-19T00:00:00Z" }) })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("cart_completed")
  })

  it("a mixed cart is refused, as the gift card refuses it", async () => {
    shipping.split_line_ids = ["item_1"]
    const res = await run(POST)
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("loyalty_mixed_cart")
    expect(created).toEqual([])
  })

  it("a cart with a gift card is refused", async () => {
    const res = await run(POST, { cart: cartRow({ credit_lines: [gift] }) })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("loyalty_with_gift_card")
    expect(created).toEqual([])
  })

  it("a cart under the order minimum is refused with the rule", async () => {
    const res = await run(POST, { cart: cartRow({ total: 29_999 }), balance: 20_000 })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("loyalty_under_minimum")
    expect(res.body.message).toContain("30")
    expect(created).toEqual([])
  })

  it("no usable balance is its own answer", async () => {
    const res = await run(POST, { balance: 99 })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe("loyalty_no_balance")
  })

  it("the point value turns points into forint", async () => {
    process.env.LOYALTY_POINT_VALUE_HUF = "2"
    await run(POST, { balance: 7_000, body: { points: 5_000 } })
    expect(created[0]).toMatchObject({ amount: 10_000, metadata: { points: 5_000 } })
  })
})

describe("DELETE /store/carts/:id/loyalty-points", () => {
  it("takes the points credit off and refreshes the payment", async () => {
    const res = await run(DELETE, { cart: cartRow({ credit_lines: [points(5_000), gift] }) })
    expect(res.statusCode).toBe(200)
    expect(deleted).toEqual(["cl_p"])
    expect(refreshed).toEqual(["cart_1"])
  })

  it("is the customer's own cart only", async () => {
    const res = await run(DELETE, { cart: cartRow({ customer_id: "cus_other", credit_lines: [points(5_000)] }) })
    expect(res.statusCode).toBe(404)
    expect(deleted).toEqual([])
  })
})

describe("GET /store/carts/:id/loyalty-points", () => {
  it("tells the checkout what the points can do for this cart", async () => {
    const res = await run(GET, { cart: cartRow({ credit_lines: [points(5_000)], total: 45_000, credit_line_total: 5_000 }), balance: 12_000 })
    expect(res.body.loyalty).toMatchObject({ applied_points: 5_000, applied_amount: 5_000, balance: 12_000, max_points: 12_000 })
  })

  it("answers 409 'off' when the switch is off, before looking at anything else", async () => {
    process.env.LOYALTY_REDEMPTION_ENABLED = "false"
    expect((await run(GET, { actor: null })).statusCode).toBe(409)
  })
})
