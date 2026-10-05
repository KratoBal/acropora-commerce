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

  /*
    CAPTURED EARLIER, AT AN ORDER EDIT (capture-before-order-edit): both parts
    are booked, and an item dropped since makes the totals differ. MI PIROSÍT:
    if Kiszállítás then refused as "partly booked" (the status change would be
    stuck), or tried to capture again.
  */
  it("both parts captured at an edit, an item dropped since: left alone, that is a refund", async () => {
    const { ops, log } = opsFor({
      shipped: shipped(3000, { captured: 4000 }),
      pickup: pickup(17000, { captured: 17000 }),
    })
    expect(await captureSharedStripePayment("order_ship", ops)).toEqual({
      captured: false,
      reason: "already_captured",
    })
    expect(log).toEqual([])
  })

  it("not a shared Stripe payment, or the pickup order itself: nothing is touched", async () => {
    for (const pair of [
      null,
      { shipped: side("o", 100, { id: "p", amount: 100, data: { id: "pi_1" } }), pickup: null },
      { shipped: pickup(), pickup: null },
    ]) {
      const { ops, log } = opsFor(pair)
      expect(await captureSharedStripePayment("o", ops)).toEqual({ captured: false, reason: "not_shared" })
      expect(log).toEqual([])
    }
  })

  /*
    A KISZÁLLÍTÁS ELŐTT TÖRÖLT BOLTI RENDELÉS (acrobot 25694, stage #28/#29). MI
    PIROSÍT: ha a törölt bolti fizetés megállítaná a Kiszállítást; ha a része
    benne maradna a levonásban; ha egy fizetés nélküli, de NEM törölt bolti
    rendelés is átmenne.
  */
  it("a pickup order canceled before the capture is part 0: only the shipped part is captured", async () => {
    const canceled: CapturePaymentSide = { ...pickup(), payment: null, payment_canceled: true }
    const { ops, log } = opsFor({ shipped: shipped(), pickup: canceled })
    expect(await captureSharedStripePayment("order_ship", ops)).toEqual({
      captured: true,
      shipped: 4950,
      pickup: 0,
    })
    expect(log).toEqual([
      'data pay_ship {"total":495000,"parts":{"pay_ship":495000}}',
      "capture pay_ship 4950",
    ])
  })

  it("a shared payment without its pickup payment is refused", async () => {
    const { ops } = opsFor({ shipped: shipped(), pickup: null })
    await expect(captureSharedStripePayment("order_ship", ops)).rejects.toThrow("no pickup order payment")
  })
})

describe("captureOnTransition", () => {
  const allowed = async () => undefined

  it("only Kiszállítás (out_for_delivery) captures", async () => {
    for (const to of ["confirmed", "stocking", "ready_for_pickup", "closed"]) {
      const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup() })
      expect(
        await captureOnTransition({ order_id: "order_ship", to }, ops, allowed)
      ).toBeNull()
      expect(log).toEqual([])
    }
    const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup() })
    await captureOnTransition({ order_id: "order_ship", to: "out_for_delivery" }, ops, allowed)
    expect(log).toHaveLength(3)
  })

  /**
   * A REFUSED TRANSITION TAKES NO MONEY. The capture step runs before the
   * status step and is not undone when that fails, so the rules are asked
   * first. What must fail: an order still in Feldolgozásra vár sent to
   * Kiszállítás capturing the shared payment before the refusal.
   */
  it("asks the transition rules first: a refused Kiszállítás captures nothing", async () => {
    const { ops, log } = opsFor({ shipped: shipped(), pickup: pickup() })
    const refused = async () => {
      throw new Error("pending_processing cannot transition to out_for_delivery")
    }
    await expect(
      captureOnTransition({ order_id: "order_ship", to: "out_for_delivery" }, ops, refused)
    ).rejects.toThrow("cannot transition")
    expect(log).toEqual([])
  })

  /**
   * AN ORDER WAITING FOR PAYMENT DOES NOT GO OUT (the lejáró zárolás plan,
   * 2.1). Its released hold leaves no live card payment, so without this the
   * capture passes like cash on delivery. What must fail: a released order, a
   * plain or a mixed one, going to Kiszállítás; a paid one refused.
   */
  it("refuses Kiszállítás while the order waits for payment, a plain and a mixed one", async () => {
    const waiting = { acropora_payment: { state: "awaiting_payment", released_at: "2026-10-05T19:00:00.000Z" } }
    const released = (side: CapturePaymentSide): CapturePaymentSide => ({ ...side, payment: null, payment_canceled: true, metadata: waiting })
    for (const pair of [
      { shipped: released(side("order_plain", 14000, { id: "pay_plain", amount: 14000 })), pickup: null },
      { shipped: released(shipped()), pickup: released(pickup()) },
    ]) {
      const { ops, log } = opsFor(pair)
      await expect(
        captureOnTransition({ order_id: pair.shipped.order_id, to: "out_for_delivery" }, ops, allowed)
      ).rejects.toThrow(/^Fizetésre vár/)
      expect(log).toEqual([])
    }
  })

  it("a paid order (the link's payment captured) goes out without a second capture", async () => {
    const paid = side("order_plain", 14000, { id: "pay_link", amount: 14000, captured: 14000, provider_id: "pp_stripe_stripe" })
    const { ops, log } = opsFor({ shipped: { ...paid, metadata: { acropora_payment: { state: "paid" } } }, pickup: null })
    expect(
      await captureOnTransition({ order_id: "order_plain", to: "out_for_delivery" }, ops, allowed)
    ).toEqual({ captured: false, reason: "already_captured" })
    expect(log).toEqual([])
  })
})
