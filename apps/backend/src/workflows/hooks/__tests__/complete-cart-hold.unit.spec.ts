/**
 * THE CART HOLD ON THE COMPLETION'S NET (V2.3, card 52024fc0). What must fail: the check left out of the hook that
 * every way of placing an order runs through, or run without the cart's metadata (a pickup half would then be a
 * stranger to its own parent's hold).
 */
let completeValidate: undefined | ((...a: any[]) => any)

jest.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: { hooks: { validate: (fn: any) => (completeValidate = fn) } },
}))
jest.mock("../../utils/aszf-guard", () => ({ guardAszf: () => ({ action: "allow" }) }))
jest.mock("../../utils/assert-cart-not-mixed", () => ({ assertCartNotMixed: async () => undefined }))
jest.mock("../../utils/locker-rule", () => ({ assertCartPointsFitLocker: async () => undefined }))
jest.mock("../../utils/assert-card-share", () => ({ assertCardShare: async () => undefined }))
jest.mock("../../utils/resolve-cart-payment-context", () => ({
  resolveCartPaymentContext: async () => ({ cash_on_delivery_fee: 0 }),
}))
jest.mock("../../utils/cod-fee-reconciliation", () => ({ assertCashOnDeliveryFeeMatchesPayment: () => undefined }))

const asked: unknown[] = []
jest.mock("../../utils/cart-hold", () => ({
  assertNoForeignHold: async (_container: unknown, cart: { id: string }) => {
    asked.push(cart)
    if (cart.id === "cart_held") throw new Error("unique_piece_held:[]")
  },
}))

beforeAll(() => {
  require("../complete-cart-cod-fee")
})

describe("completing a cart with the hold check", () => {
  beforeEach(() => {
    asked.length = 0
  })

  it("asks with the cart's id and metadata", async () => {
    const metadata = { acropora_parent_cart_id: "cart_a" }
    await completeValidate!({ cart: { id: "cart_p", metadata, items: [] } }, { container: {} })
    expect(asked).toEqual([{ id: "cart_p", metadata }])
  })

  it("a refusal stops the completion", async () => {
    await expect(
      completeValidate!({ cart: { id: "cart_held", metadata: null, items: [] } }, { container: {} })
    ).rejects.toThrow("unique_piece_held:")
  })
})
