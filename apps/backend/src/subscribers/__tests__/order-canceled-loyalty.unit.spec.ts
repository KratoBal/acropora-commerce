import orderCanceledLoyalty, { config } from "../order-canceled-loyalty"

/**
 * A CANCELLED ORDER GIVES ITS POINTS BACK (card dfb79916). What must fail: a cancelled order with points credit not
 * reversing it, by customer, cart and order; an order without one touching the ledger; a credit line that does not name
 * its customer or cart reversing something anyway; a ledger failure throwing out of the subscriber (the cancellation
 * stands) instead of being logged with the points to put back; the event not being `order.canceled`.
 */
const line = (over: Record<string, unknown> = {}) => ({
  id: "cl_1",
  amount: 700,
  reference: "loyalty_points",
  reference_id: "cus_1",
  metadata: { points: 700, cart_id: "cart_1" },
  ...over,
})
const run = async (lines: unknown[], reverse = jest.fn(async () => ({ balance: 700, points: 700, repeated: false }))) => {
  const logger = { info: jest.fn(), error: jest.fn() }
  const container = {
    resolve: (key: string) =>
      key === "logger" ? logger : key === "query" ? { graph: async () => ({ data: [{ id: "order_1", credit_lines: lines }] }) } : { reversePointsRedemption: reverse },
  }
  await orderCanceledLoyalty({ event: { data: { id: "order_1" } }, container } as never)
  return { logger, reverse }
}

describe("orderCanceledLoyalty", () => {
  it("listens to order.canceled", () => {
    expect(config.event).toBe("order.canceled")
  })

  it("gives the points back by customer, cart and order", async () => {
    const { reverse, logger } = await run([line()])
    expect(reverse).toHaveBeenCalledWith({ customer_id: "cus_1", cart_id: "cart_1", order_id: "order_1" })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("700 points back to customer cus_1"))
  })

  it("an order with no points credit (or only a gift card) touches nothing", async () => {
    const { reverse } = await run([{ id: "g", amount: 5, reference: "gift_card", reference_id: "gc", metadata: {} }])
    expect(reverse).not.toHaveBeenCalled()
  })

  it("a credit that does not name its customer or cart reverses nothing and says so", async () => {
    const { reverse, logger } = await run([line({ reference_id: null }), line({ id: "cl_2", metadata: { points: 5 } })])
    expect(reverse).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledTimes(2)
  })

  it("a ledger failure is logged with the points to put back, never thrown", async () => {
    const { logger } = await run([line()], jest.fn(async () => Promise.reject(new Error("db down"))) as never)
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/700.*cus_1.*db down.*by hand/))
  })

  it("says when it was already done", async () => {
    const { logger } = await run([line()], jest.fn(async () => ({ balance: 1, points: 700, repeated: true })) as never)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("(already done)"))
  })
})
