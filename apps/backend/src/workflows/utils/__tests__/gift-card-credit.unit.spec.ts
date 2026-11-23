import { amountOf, giftCardCreditPlan, giftCardCredits } from "../gift-card-credit"

/*
  A GIFT CARD CREDIT ON A CART (card 495c0007). WHAT TURNS RED: a credit larger than what is left to pay stays (a
  negative total); a cart with nothing left to pay keeps its credit; a credit that fits is rewritten; the total before
  credits is read without adding the credits back (Medusa's total has them off already); another credit line is taken
  for a gift card.
*/
const line = (amount: unknown, over: Record<string, unknown> = {}) => ({
  id: "cl_1",
  amount,
  reference: "gift_card",
  reference_id: "gcard_1",
  metadata: { code_last4: "H4BW", cart_id: "cart_1" },
  ...over,
})

describe("giftCardCreditPlan", () => {
  it("keeps a credit that fits: total 26 000 with a 4 000 credit means 30 000 before credits", () => {
    expect(
      giftCardCreditPlan({ totalWithCredits: 26000, creditLineTotal: 4000, credits: [line(4000)] })
    ).toEqual({ action: "keep" })
  })

  it("caps a credit the cheaper cart no longer needs: 30 000 credit, the cart now 20 000", () => {
    // Medusa's total would read -10 000: 20 000 - 30 000
    expect(
      giftCardCreditPlan({ totalWithCredits: -10000, creditLineTotal: 30000, credits: [line(30000)] })
    ).toEqual({ action: "cap", amount: 20000, line: line(30000), removeIds: ["cl_1"] })
  })

  it("removes the credit when nothing is left to pay", () => {
    expect(
      giftCardCreditPlan({ totalWithCredits: -5000, creditLineTotal: 5000, credits: [line(5000)] })
    ).toEqual({ action: "remove", removeIds: ["cl_1"] })
  })

  it("keeps one card when two are there, capped", () => {
    expect(
      giftCardCreditPlan({
        totalWithCredits: 10000,
        creditLineTotal: 3000,
        credits: [line(2000), line(1000, { id: "cl_2", reference_id: "gcard_2" })],
      })
    ).toEqual({ action: "cap", amount: 2000, line: line(2000), removeIds: ["cl_1", "cl_2"] })
  })

  it("does nothing without a gift card", () => {
    expect(giftCardCreditPlan({ totalWithCredits: 1000, creditLineTotal: 0, credits: [] })).toEqual({
      action: "keep",
    })
  })
})

describe("giftCardCredits and amountOf", () => {
  it("takes only gift card lines, and reads Medusa's money shapes", () => {
    expect(giftCardCredits([line(1), line(2, { id: "cl_x", reference: "loyalty" }), null]).map((l) => l.id)).toEqual([
      "cl_1",
    ])
    expect([amountOf(4000), amountOf("4000"), amountOf({ value: "4000", precision: 20 }), amountOf(null)]).toEqual([
      4000, 4000, 4000, 0,
    ])
  })
})
