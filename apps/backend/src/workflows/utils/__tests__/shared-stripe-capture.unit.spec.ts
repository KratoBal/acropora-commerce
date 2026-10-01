import {
  CapturePaymentSide,
  SharedCaptureOperations,
  captureOnTransition,
  captureSharedStripePayment,
} from "../shared-stripe-capture"

/**
 * THE SHARED STRIPE PAYMENT AT "KISZÁLLÍTÁS" (Balázs 2026-10-01, variant 1;
 * the shop's own out_for_delivery, acrobot 25523).
 *
 * What must fail: a capture on any other status; the parts not the two orders'
 * CURRENT amounts (an item dropped before now must make it smaller), or more
 * than the hold; the pickup booked before the shipped capture; a retry
 * capturing again; a half-booked payment for other amounts passing quietly;
 * a payment that is not a shared Stripe one touched.
 */
const SHARE = { transactionId: "pi_joint", total: 21950, own: 4950 }
const side = (
  order_id: string,
  total: number,
  payment: Partial<NonNullable<CapturePaymentSide["payment"]>> & { id: string; amount: number }
): CapturePaymentSide => ({
  order_id,
  total,
  currency_code: "huf",
  payment: { captured: 0, data: null, ...payment },
})
const shipped = (total = 4950, payment: Record<string, unknown> = {}) =>
  side("order_ship", total, { id: "pay_ship", amount: 4950, data: { id: "pi_joint", stripe_share: SHARE }, ...payment })
const pickup = (total = 17000, payment: Record<string, unknown> = {}) =>
  side("order_pick", total, {
    id: "pay_pick",
    amount: 17000,
    data: { id: "pi_joint", stripe_share: { ...SHARE, own: 17000, joined: true } },
    ...payment,
  })

const opsFor = (pair: { shipped: CapturePaymentSide; pickup: CapturePaymentSide | null } | null) => {
  const log: string[] = []
  const ops: SharedCaptureOperations = {
    loadPair: async () => pair,
    setPaymentData: async (id, data) => {
      log.push(`data ${id} ${JSON.stringify(data.stripe_capture_parts)}`)
    },
    capture: async (id, amount) => {
      log.push(`capture ${id} ${amount}`)
    },
  }
  return { ops, log }
}

describe("captureSharedStripePayment", () => {
  it("one capture for both orders' current amounts: an item dropped from the shipped one makes it smaller", async () => {
    const { ops, log } = opsFor({ shipped: shipped(4000), pickup: pickup() })
    expect(await captureSharedStripePayment("order_ship", ops)).toEqual({
      captured: true,
      shipped: 4000,
      pickup: 17000,
    })
    expect(log).toEqual([
      'data pay_ship {"total":2100000,"parts":{"pay_ship":400000,"pay_pick":1700000}}',
      "capture pay_ship 4000",
      "capture pay_pick 17000",
    ])
  })

  it("an animal dropped before shipping: the pickup part is smaller", async () => {
    const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup(8500) })
    await captureSharedStripePayment("order_ship", ops)
    expect(log[0]).toBe('data pay_ship {"total":1345000,"parts":{"pay_ship":495000,"pay_pick":850000}}')
    expect(log.slice(1)).toEqual(["capture pay_ship 4950", "capture pay_pick 8500"])
  })

  it("never more than a part of the hold, even if an order's total grew", async () => {
    const { ops, log } = opsFor({ shipped: shipped(6000), pickup: pickup() })
    await captureSharedStripePayment("order_ship", ops)
    expect(log[1]).toBe("capture pay_ship 4950")
  })

  it("every animal dropped: only the shipped part is captured", async () => {
    const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup(0) })
    await captureSharedStripePayment("order_ship", ops)
    expect(log).toEqual([
      'data pay_ship {"total":495000,"parts":{"pay_ship":495000}}',
      "capture pay_ship 4950",
    ])
  })

  it("run again after the shipped capture: only the pickup part is booked", async () => {
    const { ops, log } = opsFor({ shipped: shipped(4950, { captured: 4950 }), pickup: pickup() })
    await captureSharedStripePayment("order_ship", ops)
    expect(log).toEqual(["capture pay_pick 17000"])
  })

  it("a payment booked for another amount is refused, nothing is captured", async () => {
    const { ops, log } = opsFor({ shipped: shipped(4950, { captured: 1000 }), pickup: pickup() })
    await expect(captureSharedStripePayment("order_ship", ops)).rejects.toThrow("partly booked")
    expect(log).toEqual([])
  })

  it("not a shared Stripe payment, or the pickup order itself: nothing is touched", async () => {
    for (const pair of [
      null,
      { shipped: side("o", 100, { id: "p", amount: 100, data: { simplepay: { transactionId: 1 } } }), pickup: null },
      { shipped: pickup(), pickup: null },
    ]) {
      const { ops, log } = opsFor(pair)
      expect(await captureSharedStripePayment("o", ops)).toEqual({ captured: false, reason: "not_shared" })
      expect(log).toEqual([])
    }
  })

  it("a shared payment without its pickup payment is refused", async () => {
    const { ops } = opsFor({ shipped: shipped(), pickup: null })
    await expect(captureSharedStripePayment("order_ship", ops)).rejects.toThrow("no pickup order payment")
  })
})

describe("captureOnTransition", () => {
  it("only Kiszállítás (out_for_delivery) captures", async () => {
    for (const to of ["confirmed", "stocking", "ready_for_pickup", "closed"]) {
      const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup() })
      expect(await captureOnTransition({ order_id: "order_ship", to }, ops)).toBeNull()
      expect(log).toEqual([])
    }
    const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup() })
    await captureOnTransition({ order_id: "order_ship", to: "out_for_delivery" }, ops)
    expect(log).toHaveLength(3)
  })
})
