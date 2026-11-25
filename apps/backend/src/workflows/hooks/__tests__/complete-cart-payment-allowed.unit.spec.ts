/**
 * THE COMPLETE-CART HOOK APPLIES THE PAYMENT OFFER (card d31a66a3, slice 0). What must fail: the hook not calling the check, so a cart paid with a
 * provider the offer hides is placed by the stock `/complete` and by `complete-split` alike (measured 2026-11-25, HTTP 200 both); the refusal
 * coming AFTER the points or the gift card were taken (a refused placement must take nothing); an offered provider refused.
 */
let completeValidate: undefined | ((...a: any[]) => any)

jest.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: {
    hooks: {
      validate: (fn: any) => {
        completeValidate = fn
      },
    },
  },
}))
jest.mock("../../utils/aszf-guard", () => ({ guardAszf: () => ({ action: "allow" }) }))
jest.mock("../../utils/assert-cart-not-mixed", () => ({ assertCartNotMixed: async () => undefined }))
jest.mock("../../utils/locker-rule", () => ({ assertCartPointsFitLocker: async () => undefined }))
jest.mock("../../utils/assert-card-share", () => ({ assertCardShare: async () => undefined }))
jest.mock("../../utils/cod-fee-reconciliation", () => ({ assertCashOnDeliveryFeeMatchesPayment: () => undefined }))
jest.mock("../../utils/personal-discount-coupon", () => ({ assertCartHasNoCouponWithPersonalDiscount: async () => undefined }))
jest.mock("../../utils/cart-hold", () => ({ assertNoForeignHold: async () => undefined }))
jest.mock("../../utils/load-cart-shipping-decision", () => ({ loadCartShippingDecision: async () => ({ split_line_ids: [] }) }))
jest.mock("../../utils/resolve-cart-payment-context", () => ({
  resolveCartPaymentContext: async () => ({
    cash_on_delivery_fee: 0,
    shipping_roles: ["COURIER"],
    allowed_payment_roles: ["ONLINE_CARD", "COD"],
    allowed_payment_providers: [
      { id: "pp_stripe_stripe", role: "ONLINE_CARD" },
      { id: "pp_acropora_cod", role: "COD" },
    ],
  }),
}))
const calls: string[] = []
jest.mock("../../utils/redeem-cart-loyalty", () => ({
  redeemCartLoyalty: async () => void calls.push("redeem-loyalty"),
  voidCartLoyaltyRedemption: async () => undefined,
}))
jest.mock("../../utils/redeem-cart-gift-card", () => ({
  redeemCartGiftCard: async () => void calls.push("redeem-gift"),
  voidCartGiftCardRedemption: async () => undefined,
}))

beforeAll(() => {
  require("../complete-cart-cod-fee")
})
beforeEach(() => {
  calls.length = 0
})

const cartWith = (provider: string, status = "pending") => ({
  id: "cart_1",
  metadata: null,
  items: [],
  payment_collection: { payment_sessions: [{ provider_id: provider, status }] },
})
const run = (cart: unknown) => completeValidate!({ cart }, { container: { resolve: () => ({ warn: () => undefined }) } })

describe("the complete-cart hook and the payment offer", () => {
  it("a provider the offer hides stops the placement, and nothing was taken before it (no points, no gift card)", async () => {
    for (const provider of ["pp_acropora_transfer", "pp_system_default"]) {
      await expect(run(cartWith(provider))).rejects.toThrow(/fizetési mód ehhez a rendeléshez nem érhető el/)
    }
    expect(calls).toEqual([])
  })

  it("an offered provider is placed, and then the redemptions run", async () => {
    await expect(run(cartWith("pp_stripe_stripe"))).resolves.toBeDefined()
    expect(calls).toEqual(["redeem-loyalty", "redeem-gift"])
  })
})
