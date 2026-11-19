import { capLoyaltyCredit } from "../cap-loyalty-credit"

/*
  THE POINTS CREDIT STAYS WITHIN THE CART (card dfb79916). WHAT TURNS RED: a credit kept when the cart fell under the
  order minimum; a cap that is not whole points or does not carry the customer and the cart on; a credit raised when the
  cart got dearer; a cart without points touching the credit lines; an error thrown out of the refresh (every cart
  operation passes here: it must never throw).
*/
const credit = (points: number) => ({
  id: "cl_1",
  amount: points,
  reference: "loyalty_points",
  reference_id: "cus_1",
  metadata: { points, cart_id: "cart_1" },
})
const logger = () => ({ info: jest.fn(), error: jest.fn() }) as never

const setup = (row: Record<string, unknown> | null) => {
  const deleteCreditLines = jest.fn(async () => undefined)
  const createCreditLines = jest.fn(async () => undefined)
  const graph = jest.fn(async () => ({ data: row ? [row] : [] }))
  const container = {
    resolve: (key: string) => (key === "query" ? { graph } : { deleteCreditLines, createCreditLines }),
  } as never
  return { deleteCreditLines, createCreditLines, container }
}

beforeEach(() => {
  process.env.LOYALTY_REDEMPTION_ENABLED = "true"
  delete process.env.LOYALTY_MAX_PERCENT
})
afterAll(() => {
  delete process.env.LOYALTY_REDEMPTION_ENABLED
  delete process.env.LOYALTY_MAX_PERCENT
})

describe("capLoyaltyCredit", () => {
  it("leaves a credit that still fits", async () => {
    const s = setup({ total: 20_000, credit_line_total: 10_000, credit_lines: [credit(10_000)] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    expect(s.deleteCreditLines).not.toHaveBeenCalled()
    expect(s.createCreditLines).not.toHaveBeenCalled()
  })

  it("lowers a credit to the whole points the cart now takes, keeping the customer and the cart", async () => {
    process.env.LOYALTY_MAX_PERCENT = "20"
    const s = setup({ total: 22_000, credit_line_total: 8_000, credit_lines: [credit(8_000)] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    expect(s.deleteCreditLines).toHaveBeenCalledWith(["cl_1"])
    expect(s.createCreditLines).toHaveBeenCalledWith([
      {
        cart_id: "cart_1",
        amount: 6_000,
        reference: "loyalty_points",
        reference_id: "cus_1",
        metadata: { points: 6_000, cart_id: "cart_1" },
      },
    ])
  })

  it("removes the credit when the cart fell under the order minimum", async () => {
    const s = setup({ total: 4_000, credit_line_total: 10_000, credit_lines: [credit(10_000)] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    expect(s.deleteCreditLines).toHaveBeenCalledWith(["cl_1"])
    expect(s.createCreditLines).not.toHaveBeenCalled()
  })

  it("a gift card's credit takes its share first: the points credit that no longer fits is removed", async () => {
    const gift = { id: "cl_g", amount: 35_000, reference: "gift_card", reference_id: "gc", metadata: {} }
    const s = setup({ total: 0, credit_line_total: 40_000, credit_lines: [credit(5_000), gift] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    // only the points line goes: the gift card's is not this function's
    expect(s.deleteCreditLines).toHaveBeenCalledWith(["cl_1"])
    expect(s.createCreditLines).not.toHaveBeenCalled()
  })

  it("never raises a credit when the cart got dearer", async () => {
    const s = setup({ total: 90_000, credit_line_total: 10_000, credit_lines: [credit(10_000)] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    expect(s.createCreditLines).not.toHaveBeenCalled()
  })

  it("a cart without points touches nothing", async () => {
    const s = setup({ total: 90_000, credit_line_total: 0, credit_lines: [] })
    await capLoyaltyCredit("cart_1", s.container, logger())
    expect(s.deleteCreditLines).not.toHaveBeenCalled()
  })

  it("never throws: a failing read is logged", async () => {
    const log = logger() as unknown as { error: jest.Mock }
    const container = { resolve: () => ({ graph: async () => Promise.reject(new Error("db down")) }) } as never
    await expect(capLoyaltyCredit("cart_1", container, log as never)).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("db down"))
  })
})
