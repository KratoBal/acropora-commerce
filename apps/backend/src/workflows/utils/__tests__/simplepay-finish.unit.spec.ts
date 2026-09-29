const completeSplitCart = jest.fn(async () => ({ order_ids: ["order_1"], pending_pickup_cart_id: null }))
const loadCartShippingDecision = jest.fn(async () => ({ split_line_ids: [] as string[] }))
jest.mock("../split-completion", () => ({ completeSplitCart: (...a: unknown[]) => (completeSplitCart as any)(...a) }))
jest.mock("../split-completion-operations", () => ({ splitCompletionOperations: () => ({}) }))
jest.mock("../load-cart-shipping-decision", () => ({
  loadCartShippingDecision: (...a: unknown[]) => (loadCartShippingDecision as any)(...a),
}))

import { finishSimplePayOrder } from "../simplepay-finish"

const container = (session: unknown) =>
  ({ resolve: () => ({ graph: async () => ({ data: session ? [session] : [] }) }) }) as never

const SESSION = {
  id: "payses_1",
  data: { simplepay: { transactionId: 501234567 } },
  payment_collection: { cart: { id: "cart_1" } },
}
const IPN = { orderRef: "payses_1-x", merchant: "M", transactionId: 501234567, status: "FINISHED" }

beforeEach(() => {
  completeSplitCart.mockClear()
  loadCartShippingDecision.mockClear()
})

/**
 * A FINISHED IPN MAKES THE ORDER (P4-3b). What must fail: an order made for an
 * orderRef that is not ours, or for a transaction that is not the session's; a
 * mixed cart paid by card completed by moving its lines after payment.
 */
describe("finishing a SimplePay order", () => {
  it("completes the session's cart", async () => {
    await finishSimplePayOrder(container(SESSION), IPN as never)
    expect(completeSplitCart.mock.calls[0][0]).toBe("cart_1")
  })

  it("refuses an orderRef that is not ours, an unknown session, and another transaction", async () => {
    await expect(finishSimplePayOrder(container(SESSION), { ...IPN, orderRef: "101010" } as never)).rejects.toThrow("Not our orderRef")
    await expect(finishSimplePayOrder(container(null), IPN as never)).rejects.toThrow("No cart for payment session")
    await expect(finishSimplePayOrder(container(SESSION), { ...IPN, transactionId: 999 } as never)).rejects.toThrow("is not the one on session")
    expect(completeSplitCart).not.toHaveBeenCalled()
  })

  it("refuses a mixed cart (one transaction for both orders is P4-3c)", async () => {
    loadCartShippingDecision.mockResolvedValueOnce({ split_line_ids: ["l2"] })
    await expect(finishSimplePayOrder(container(SESSION), IPN as never)).rejects.toThrow("is mixed")
    expect(completeSplitCart).not.toHaveBeenCalled()
  })
})
