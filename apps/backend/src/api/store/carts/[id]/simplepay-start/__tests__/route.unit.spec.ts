const startCardPayment = jest.fn(async () => ({ payment_url: "https://sandbox.simplepay.hu/pay/x", total: 13450 }))
const sharedPaymentOperations = jest.fn(() => ({ ops: true }))

jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  startCardPayment: (...args: unknown[]) => (startCardPayment as any)(...args),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  sharedPaymentOperations: (...args: unknown[]) => (sharedPaymentOperations as any)(...args),
}))

import { POST } from "../route"

/**
 * THE SHARED CARD PAYMENT ROUTE (P4-3c2b). What must fail: the provider or the
 * store pickup option taken from anywhere but our configuration; anything but
 * the cart id read from the request.
 */
describe("POST /store/carts/:id/simplepay-start", () => {
  it("starts with our card provider and store pickup option, and answers with the payment URL", async () => {
    const saved = { ...process.env }
    Object.assign(process.env, { ACROPORA_PP_ONLINE_CARD: "pp_simplepay_simplepay", ACROPORA_SO_PICKUP: "so_bolt" })
    const res = { json: jest.fn() }
    try {
      await POST({ params: { id: "cart_1" }, body: { providerId: "pp_mas", total: 1 }, scope: {} } as never, res as never)
    } finally {
      process.env = saved
    }

    expect(startCardPayment.mock.calls[0][0]).toBe("cart_1")
    expect(startCardPayment.mock.calls[0][2]).toEqual({ providerId: "pp_simplepay_simplepay" })
    expect((sharedPaymentOperations.mock.calls[0] as unknown[])[1]).toEqual({ storePickupOptionId: "so_bolt" })
    expect(res.json).toHaveBeenCalledWith({ payment_url: "https://sandbox.simplepay.hu/pay/x", total: 13450 })
  })

  /**
   * STRIPE MAY BE LISTED IN THE SAME ROLE. What must fail: this start using
   * whichever card provider is first, or Stripe when SimplePay is not listed.
   */
  it("takes SimplePay by name from the card list, and nothing if it is not listed", async () => {
    const call = async (list: string) => {
      startCardPayment.mockClear()
      const saved = { ...process.env }
      Object.assign(process.env, { ACROPORA_PP_ONLINE_CARD: list, ACROPORA_SO_PICKUP: "so_bolt" })
      try {
        await POST({ params: { id: "cart_1" }, body: {}, scope: {} } as never, { json: jest.fn() } as never)
      } finally {
        process.env = saved
      }
      return (startCardPayment.mock.calls[0] as unknown[])[2]
    }

    expect(await call("pp_stripe_stripe, pp_simplepay_simplepay")).toEqual({ providerId: "pp_simplepay_simplepay" })
    expect(await call("pp_stripe_stripe")).toEqual({ providerId: "" })
  })
})
