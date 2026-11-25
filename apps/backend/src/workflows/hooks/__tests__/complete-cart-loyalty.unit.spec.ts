/**
 * THE COMPLETION TAKES THE POINTS AND THE GIFT CARD'S SHARE, AND GIVES BOTH BACK (card dfb79916). What must fail: a
 * gift card refusing after the points were taken and the points left taken (a handler that throws has no compensation of
 * its own); the compensation not voiding the points or the gift card; a points refusal reaching the gift card; the
 * redemptions not reaching the compensation.
 */
let completeValidate: undefined | ((...a: any[]) => any)
let completeCompensate: undefined | ((...a: any[]) => any)

jest.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: {
    hooks: {
      validate: (fn: any, compensation: any) => {
        completeValidate = fn
        completeCompensate = compensation
      },
    },
  },
}))
jest.mock("../../utils/aszf-guard", () => ({ guardAszf: () => ({ action: "allow" }) }))
jest.mock("../../utils/assert-cart-not-mixed", () => ({ assertCartNotMixed: async () => undefined }))
jest.mock("../../utils/locker-rule", () => ({ assertCartPointsFitLocker: async () => undefined }))
jest.mock("../../utils/assert-card-share", () => ({ assertCardShare: async () => undefined }))
jest.mock("../../utils/resolve-cart-payment-context", () => ({
  resolveCartPaymentContext: async () => ({ cash_on_delivery_fee: 0 }),
}))
jest.mock("../../utils/cod-fee-reconciliation", () => ({ assertCashOnDeliveryFeeMatchesPayment: () => undefined }))
jest.mock("../../utils/personal-discount-coupon", () => ({ assertCartHasNoCouponWithPersonalDiscount: async () => undefined }))
jest.mock("../../utils/assert-payment-allowed", () => ({ assertPaymentAllowedForCart: async () => undefined }))
jest.mock("../../utils/cart-hold", () => ({ assertNoForeignHold: async () => undefined }))

const calls: string[] = []
const state = { loyalty: null as unknown, gift: null as unknown, loyaltyError: null as Error | null, giftError: null as Error | null }
jest.mock("../../utils/redeem-cart-loyalty", () => ({
  redeemCartLoyalty: async () => {
    calls.push("redeem-loyalty")
    if (state.loyaltyError) throw state.loyaltyError
    return state.loyalty
  },
  voidCartLoyaltyRedemption: async (r: unknown) => void calls.push(`void-loyalty:${JSON.stringify(r)}`),
}))
jest.mock("../../utils/redeem-cart-gift-card", () => ({
  redeemCartGiftCard: async () => {
    calls.push("redeem-gift")
    if (state.giftError) throw state.giftError
    return state.gift
  },
  voidCartGiftCardRedemption: async (r: unknown) => void calls.push(`void-gift:${JSON.stringify(r)}`),
}))

beforeAll(() => {
  require("../complete-cart-cod-fee")
})
beforeEach(() => {
  calls.length = 0
  state.loyalty = null
  state.gift = null
  state.loyaltyError = null
  state.giftError = null
})

const cart = { id: "cart_1", metadata: null, items: [] }
const run = () => completeValidate!({ cart }, { container: {} })
const LOYALTY = { customer_id: "cus_1", cart_id: "cart_1", points: 500, repeated: false }
const GIFT = { gift_card_id: "gc", reference: "cart_1", amount: 700, repeated: false }

describe("the complete-cart hook's redemptions", () => {
  it("takes the points first, then the gift card, and hands both to the compensation", async () => {
    state.loyalty = LOYALTY
    state.gift = GIFT
    const response = await run()
    expect(calls).toEqual(["redeem-loyalty", "redeem-gift"])
    expect(response.compensateInput).toEqual({ gift: GIFT, loyalty: LOYALTY })
  })

  it("the compensation gives both back", async () => {
    await completeCompensate!({ gift: GIFT, loyalty: LOYALTY }, { container: {} })
    expect(calls).toEqual([`void-gift:${JSON.stringify(GIFT)}`, `void-loyalty:${JSON.stringify(LOYALTY)}`])
  })

  it("a compensation with nothing recorded is harmless", async () => {
    await expect(completeCompensate!(undefined, { container: {} })).resolves.toBeUndefined()
  })

  it("a gift card that refuses after the points were taken gives the points back, then refuses", async () => {
    state.loyalty = LOYALTY
    state.giftError = new Error("gift refused")
    await expect(run()).rejects.toThrow("gift refused")
    expect(calls).toEqual(["redeem-loyalty", "redeem-gift", `void-loyalty:${JSON.stringify(LOYALTY)}`])
  })

  it("a points refusal never reaches the gift card", async () => {
    state.loyaltyError = new Error("points refused")
    await expect(run()).rejects.toThrow("points refused")
    expect(calls).toEqual(["redeem-loyalty"])
  })

  it("a cart that pays with neither answers nothing to give back", async () => {
    const response = await run()
    expect(response.compensateInput).toEqual({ gift: null, loyalty: null })
  })
})
