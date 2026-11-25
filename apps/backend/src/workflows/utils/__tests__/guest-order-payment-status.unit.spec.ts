import { orderOutstanding, orderPaymentStatus, type PaymentCollectionFacts } from "../guest-order/payment-status"

/*
  THE ORDER PAYMENT STATUS, MEDUSA'S RULE (acrobot 60746). MI PIROSÍT: a waiting order (cash on delivery, bank transfer, a card
  order whose hold was released and whose link is open) does not read awaiting or not_paid, so the guest page shows no waiting
  line; a captured or refunded order reads anything else; the order of the checks differs from Medusa's (requires_action first,
  refunds before captures, canceled only when every collection is).
*/
const c = (over: Partial<PaymentCollectionFacts>): PaymentCollectionFacts => ({
  status: "not_paid",
  amount: 10000,
  captured_amount: 0,
  refunded_amount: 0,
  ...over,
})

describe("the order payment status, as Medusa computes it", () => {
  it("waiting: a pending collection is awaiting, a fresh one not_paid; a released hold beside an open link is not_paid", () => {
    expect(orderPaymentStatus([c({ status: "awaiting" })])).toBe("awaiting")
    expect(orderPaymentStatus([c({ status: "not_paid" })])).toBe("not_paid")
    expect(orderPaymentStatus([c({ status: "canceled" }), c({ status: "not_paid" })])).toBe("not_paid")
    expect(orderPaymentStatus([])).toBe("not_paid")
  })

  it("held, paid and refunded", () => {
    expect(orderPaymentStatus([c({ status: "authorized" })])).toBe("authorized")
    expect(orderPaymentStatus([c({ status: "authorized" }), c({ status: "not_paid" })])).toBe("partially_authorized")
    expect(orderPaymentStatus([c({ status: "completed", captured_amount: 10000 })])).toBe("captured")
    expect(orderPaymentStatus([c({ status: "partially_captured", captured_amount: 4000 })])).toBe("partially_captured")
    expect(orderPaymentStatus([c({ status: "completed", amount: 0 })])).toBe("captured")
    expect(
      orderPaymentStatus([c({ status: "completed", captured_amount: 10000, refunded_amount: 10000 })]),
    ).toBe("refunded")
    expect(
      orderPaymentStatus([c({ status: "completed", captured_amount: 10000, refunded_amount: 3000 })]),
    ).toBe("partially_refunded")
  })

  it("an amount that is not a number gives no status, not not_paid (a paid order would read Fizetésre vár)", () => {
    expect(orderPaymentStatus([c({ status: "completed", captured_amount: Number.NaN })])).toBeNull()
    expect(orderPaymentStatus([c({ status: "completed", amount: Number.NaN, captured_amount: 10000 })])).toBeNull()
  })

  it("Medusa's order of checks: requires_action first; canceled only when every collection is", () => {
    expect(orderPaymentStatus([c({ status: "requires_action", captured_amount: 10000 })])).toBe("requires_action")
    expect(orderPaymentStatus([c({ status: "canceled" })])).toBe("canceled")
    expect(orderPaymentStatus([c({ status: "canceled" }), c({ status: "authorized" })])).toBe("authorized")
  })
})

/*
  WHAT IS LEFT AFTER AN ADVANCE (card d31a66a3, 2b; acrobot 61267). MI PIROSÍT: a partly captured order shows no balance, or the
  total; a canceled collection's money counts as paid; a paid, waiting or unreadable order gets a balance line.
*/
describe("the balance after an advance", () => {
  it("a partly captured order: the total less what its live collections captured", () => {
    const advance = [c({ status: "canceled", captured_amount: 0 }), c({ status: "partially_captured", amount: 4800, captured_amount: 1920 })]
    expect(orderPaymentStatus(advance)).toBe("partially_captured")
    expect(orderOutstanding(4800, advance, "partially_captured")).toBe(2880)
  })

  it("no balance line for any other status, nor for an amount that cannot be read", () => {
    expect(orderOutstanding(4800, [c({ status: "completed", amount: 4800, captured_amount: 4800 })], "captured")).toBeNull()
    expect(orderOutstanding(4800, [c({})], "not_paid")).toBeNull()
    expect(orderOutstanding(4800, [c({ captured_amount: Number.NaN })], "partially_captured")).toBeNull()
  })
})
