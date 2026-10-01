const rejoinAndClearSharedSplit = jest.fn(async () => ({ rejoined: true }))
const sharedPaymentOperations = jest.fn(() => ({ ops: true }))

jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  rejoinAndClearSharedSplit: (...args: unknown[]) => (rejoinAndClearSharedSplit as any)(...args),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  sharedPaymentOperations: (...args: unknown[]) => (sharedPaymentOperations as any)(...args),
}))

import { POST } from "../route"

/**
 * THE STRIPE REJOIN ROUTE. What must fail: anything but the cart id read from
 * the request, or the store pickup option not reaching the operations.
 */
describe("POST /store/carts/:id/stripe-rejoin", () => {
  it("rejoins the cart named in the path, and answers whether it did", async () => {
    const saved = { ...process.env }
    Object.assign(process.env, { ACROPORA_SO_PICKUP: "so_bolt" })
    const res = { json: jest.fn() }
    try {
      await POST({ params: { id: "cart_1" }, body: { cart_id: "cart_x" }, scope: {} } as never, res as never)
    } finally {
      process.env = saved
    }
    expect((rejoinAndClearSharedSplit.mock.calls[0] as unknown[])[0]).toBe("cart_1")
    expect((sharedPaymentOperations.mock.calls[0] as unknown[])[1]).toEqual({ storePickupOptionId: "so_bolt" })
    expect(res.json).toHaveBeenCalledWith({ rejoined: true })
  })
})
