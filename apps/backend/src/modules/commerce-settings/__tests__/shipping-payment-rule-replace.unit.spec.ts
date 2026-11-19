import { planShippingPaymentRuleReplace } from "../service"

/*
  A MATRIX SAVE, PAIR BY PAIR (card e0e2378b; the #804 version refused every save, acrobot 56585). WHAT TURNS RED: a pair
  that stays is created again (the partial unique index refuses it: "already exists"); a moved pair is not moved; a pair
  that is gone stays live; an unchanged matrix writes anything.
*/
const live = [
  { id: "r1", shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 1 },
  { id: "r2", shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
  { id: "r3", shipping_role: "FOXPOST", payment_role: "BANK_TRANSFER", position: 3 },
  { id: "r4", shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 1 },
]
const rowsOf = (list: typeof live) =>
  list.map(({ shipping_role, payment_role, position }) => ({ shipping_role, payment_role, position }))

describe("planShippingPaymentRuleReplace", () => {
  it("an unchanged matrix changes nothing", () => {
    expect(planShippingPaymentRuleReplace(live, rowsOf(live))).toEqual({
      removed: [],
      moved: [],
      created: [],
    })
  })

  it("a reversed list only moves the pairs: none is created again", () => {
    const plan = planShippingPaymentRuleReplace(live, [
      { shipping_role: "FOXPOST", payment_role: "BANK_TRANSFER", position: 1 },
      { shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
      { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 3 },
      { shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 1 },
    ])
    expect(plan).toEqual({
      removed: [],
      moved: [
        { id: "r1", position: 3 },
        { id: "r3", position: 1 },
      ],
      created: [],
    })
  })

  it("a pair gone is removed, a new one created, the rest moved into place", () => {
    const plan = planShippingPaymentRuleReplace(live, [
      { shipping_role: "FOXPOST", payment_role: "COD", position: 1 },
      { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 2 },
      { shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 1 },
      { shipping_role: "PICKUP", payment_role: "BANK_TRANSFER", position: 2 },
    ])
    expect(plan).toEqual({
      removed: ["r3"],
      moved: [
        { id: "r1", position: 2 },
        { id: "r2", position: 1 },
      ],
      created: [{ shipping_role: "PICKUP", payment_role: "BANK_TRANSFER", position: 2 }],
    })
  })
})
