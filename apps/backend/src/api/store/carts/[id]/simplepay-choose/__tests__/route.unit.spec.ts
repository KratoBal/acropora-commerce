const chooseCardPayment = jest.fn(async () => undefined)
const sharedPaymentOperations = jest.fn(() => ({ ops: true }))
jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  chooseCardPayment: (...a: unknown[]) => (chooseCardPayment as any)(...a),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  sharedPaymentOperations: (...a: unknown[]) => (sharedPaymentOperations as any)(...a),
}))

import { POST } from "../route"

/**
 * THE CARD CHOICE ROUTE (P4-4). What must fail: the choice not reaching the
 * cart named in the path, or with another store pickup option than ours.
 */
describe("POST /store/carts/:id/simplepay-choose", () => {
  it("drops the old payment of the cart in the path, and answers ok", async () => {
    const saved = { ...process.env }
    process.env.ACROPORA_SO_PICKUP = "so_bolt"
    const res = { json: jest.fn() }
    try {
      await POST({ params: { id: "cart_1" }, body: { cart_id: "cart_masik" }, scope: {} } as never, res as never)
    } finally {
      process.env = saved
    }
    expect((chooseCardPayment.mock.calls[0] as unknown[])[0]).toBe("cart_1")
    expect((sharedPaymentOperations.mock.calls[0] as unknown[])[1]).toEqual({ storePickupOptionId: "so_bolt" })
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})
