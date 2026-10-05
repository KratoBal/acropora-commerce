import { capturePlainStripePayment } from "../plain-stripe-capture"
import {
  CapturePaymentSide,
  SharedCaptureOperations,
  captureOnTransition,
} from "../shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "../stripe-config"

/**
 * "KISZÁLLÍTÁS" CAPTURES A PLAIN CARD ORDER TOO (C2, the prompt's point 8).
 *
 * What must fail: a plain card order going out with nothing captured; the
 * capture not the order's CURRENT total (an item dropped by an order edit must
 * make it smaller); more than the hold captured, or a zero order; a payment
 * already captured captured again; cash on delivery, or a mixed cart's share,
 * touched here; the capture happening on any status but Kiszállítás, or before
 * the transition rules said yes.
 */
const order = (
  total: number,
  payment: Partial<NonNullable<CapturePaymentSide["payment"]>> | null = {}
): CapturePaymentSide => ({
  order_id: "order_plain",
  total,
  currency_code: "huf",
  payment:
    payment === null
      ? null
      : {
          id: "pay_plain",
          amount: 14000,
          captured: 0,
          provider_id: STRIPE_PROVIDER_ID,
          data: { id: "pi_plain", client_secret: "secret" },
          ...payment,
        },
})

const opsFor = (side: CapturePaymentSide | null) => {
  const log: string[] = []
  const ops: SharedCaptureOperations = {
    loadPair: async () => (side ? { shipped: side, pickup: null } : null),
    setPaymentData: async () => {
      log.push("data")
    },
    capture: async (id, amount) => {
      log.push(`capture ${id} ${amount}`)
    },
  }
  return { ops, log }
}

describe("capturePlainStripePayment", () => {
  it("captures the order's current total, a smaller one after an order edit too", async () => {
    for (const total of [14000, 11500]) {
      const { ops, log } = opsFor(order(total))
      expect(await capturePlainStripePayment("order_plain", ops)).toEqual({ captured: true, amount: total })
      expect(log).toEqual([`capture pay_plain ${total}`])
    }
  })

  it("refuses more than the hold and a zero order, loudly, and captures nothing", async () => {
    for (const [total, message] of [
      // an item added over the hold, its difference not paid (plan section 5)
      [15000, /^Fizetésre vár: a rendelés többe kerül, mint a kártyán zárolt összeg/],
      [0, /nincs mit levonni/],
    ] as const) {
      const { ops, log } = opsFor(order(total))
      await expect(capturePlainStripePayment("order_plain", ops)).rejects.toThrow(message)
      expect(log).toEqual([])
    }
  })

  /**
   * AN ITEM ADDED OVER THE HOLD, ITS DIFFERENCE PAID THROUGH A LINK (plan
   * section 5): the hold is taken for the rest, not for the whole total. What
   * must fail: the total taken from the hold (the difference charged twice,
   * or refused as over the hold); an unpaid part of the difference passing.
   */
  it("takes from the hold only what the paid difference does not cover", async () => {
    const paid = { ...order(16500), other_captured: 2500 }
    const { ops, log } = opsFor(paid)
    expect(await capturePlainStripePayment("order_plain", ops)).toEqual({ captured: true, amount: 14000 })
    expect(log).toEqual(["capture pay_plain 14000"])

    const short = opsFor({ ...order(16500), other_captured: 2000 })
    await expect(capturePlainStripePayment("order_plain", short.ops)).rejects.toThrow(/különbözet még nincs kifizetve/)
    expect(short.log).toEqual([])
  })

  it("leaves cash on delivery, an already captured payment and a mixed cart's share alone", async () => {
    const cases: [CapturePaymentSide, string][] = [
      [order(14000, { provider_id: "pp_acropora_cod" }), "not_card"],
      [order(14000, null), "not_card"],
      [order(14000, { captured: 14000 }), "already_captured"],
      [order(14000, { data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 14000 } } }), "shared"],
    ]
    for (const [side, reason] of cases) {
      const { ops, log } = opsFor(side)
      expect(await capturePlainStripePayment("order_plain", ops)).toEqual({ captured: false, reason })
      expect(log).toEqual([])
    }
  })
})

describe("captureOnTransition, a plain card order", () => {
  const allowed = async () => undefined

  it("Kiszállítás captures it, after the rules said yes; any other status does not", async () => {
    const { ops, log } = opsFor(order(14000))
    await captureOnTransition({ order_id: "order_plain", to: "out_for_delivery" }, ops, allowed)
    expect(log).toEqual(["capture pay_plain 14000"])

    for (const to of ["confirmed", "stocking", "ready_for_pickup", "closed"]) {
      const other = opsFor(order(14000))
      expect(await captureOnTransition({ order_id: "order_plain", to }, other.ops, allowed)).toBeNull()
      expect(other.log).toEqual([])
    }

    const refused = opsFor(order(14000))
    await expect(
      captureOnTransition({ order_id: "order_plain", to: "out_for_delivery" }, refused.ops, async () => {
        throw new Error("pending_processing cannot transition to out_for_delivery")
      })
    ).rejects.toThrow("cannot transition")
    expect(refused.log).toEqual([])
  })
})
