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

const opsFor = (side: CapturePaymentSide | null, captureFails?: string) => {
  const log: string[] = []
  const ops: SharedCaptureOperations = {
    loadPair: async () => (side ? { shipped: side, pickup: null } : null),
    setPaymentData: async () => {
      log.push("data")
    },
    capture: async (id, amount) => {
      log.push(`capture ${id} ${amount}`)
      if (captureFails !== undefined) throw new Error(captureFails)
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
      [0, /nincs mit levonni.*nem kiszállítani és nem lezárni/],
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

  it("more paid as a difference than the order costs: a refund is named, nothing is captured", async () => {
    const { ops, log } = opsFor({ ...order(900), other_captured: 1050 })
    await expect(capturePlainStripePayment("order_plain", ops)).rejects.toThrow(/1050 Ft.*900 Ft.*150 Ft.*vissza kell téríteni/)
    expect(log).toEqual([])
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

    for (const to of ["confirmed", "stocking", "ready_for_pickup"]) {
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

/*
  A CARD ORDER IS NOT CLOSED WITH A HOLD STILL OPEN (card d4a1d99d; measured 2026-11-25: Készletezés -> Átvehető -> Lezárva left the Stripe
  hold uncaptured). What must fail: a plain card order closed with nothing captured; the capture before the rules said yes; a refused capture
  (an expired hold, a refused card, an order edit running) letting the close go on; an order captured at Kiszállítás captured AGAIN at the
  close; a mixed cart's share, cash on delivery or a transfer touched by it; the shared path's refusals (waiting for payment) now applying to
  the close.
*/
describe("captureOnTransition to closed, a plain card order", () => {
  const allowed = async () => undefined

  it("captures the order's current total before the close, after the rules said yes", async () => {
    const { ops, log } = opsFor(order(14000))
    expect(await captureOnTransition({ order_id: "order_plain", to: "closed" }, ops, allowed)).toEqual({ captured: true, amount: 14000 })
    expect(log).toEqual(["capture pay_plain 14000"])

    const refused = opsFor(order(14000))
    await expect(
      captureOnTransition({ order_id: "order_plain", to: "closed" }, refused.ops, async () => {
        throw new Error("confirmed cannot transition to closed")
      })
    ).rejects.toThrow("cannot transition")
    expect(refused.log).toEqual([])
  })

  it("a refused capture stops the close and says why (the hold is smaller than the total: the difference is unpaid)", async () => {
    const { ops, log } = opsFor(order(20000, { amount: 14000 }))
    await expect(captureOnTransition({ order_id: "order_plain", to: "closed" }, ops, allowed)).rejects.toThrow()
    expect(log).toEqual([])
  })

  it("an order that already went out (captured at Kiszállítás) is not captured again", async () => {
    const { ops, log } = opsFor(order(14000, { captured: 14000 }))
    expect(await captureOnTransition({ order_id: "order_plain", to: "closed" }, ops, allowed)).toEqual({
      captured: false,
      reason: "already_captured",
    })
    expect(log).toEqual([])
  })

  it("cash on delivery or any other provider, and a mixed cart's share, pass without a capture", async () => {
    const cod = opsFor(order(14000, { provider_id: "pp_acropora_cod" }))
    expect(await captureOnTransition({ order_id: "order_plain", to: "closed" }, cod.ops, allowed)).toEqual({
      captured: false,
      reason: "not_card",
    })
    const share = opsFor(
      order(14000, { data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 25800, own: 14000 } } })
    )
    expect(await captureOnTransition({ order_id: "order_plain", to: "closed" }, share.ops, allowed)).toEqual({
      captured: false,
      reason: "shared",
    })
    expect([cod.log, share.log]).toEqual([[], []])
  })

  it("an order whose payment is waiting for a difference is NOT refused by the close: that refusal is Kiszállítás's, not the close's", async () => {
    const waiting = { ...order(14000), metadata: { acropora_payment: { state: "awaiting_payment" } } }
    const closing = opsFor(waiting)
    // the close's capture runs on its own rules (the hold covers the total), so it captures
    expect(await captureOnTransition({ order_id: "order_plain", to: "closed" }, closing.ops, allowed)).toEqual({
      captured: true,
      amount: 14000,
    })
    // while Kiszállítás of the same order IS refused while the difference waits
    const shipping = opsFor(waiting)
    await expect(
      captureOnTransition({ order_id: "order_plain", to: "out_for_delivery" }, shipping.ops, allowed)
    ).rejects.toThrow()
    expect(shipping.log).toEqual([])
  })
})

/*
  A FAILED CAPTURE TELLS THE OPERATOR THE TRUTH (card 23ebb2a2; barracuda 61127, BLOCKING in the first version). The capture is Medusa's: Stripe
  captures first, then Medusa books it. An error AFTER Stripe's success (a timeout on the answer, a failed write, a retried call) leaves the
  customer's card ALREADY CHARGED; a sentence that said "the money did not come off, send a payment link" would make the operator ask twice.
  What must fail: the link advice or the "another card" advice on an error that does not NAME an expired hold or a declined card (a network
  timeout, a database error, an "already captured"); the unknown case not telling the operator to LOOK AT STRIPE before asking for money again,
  or not naming the PaymentIntent; the known causes losing their advice; the provider's words lost, or more than one short line; the status
  claim missing.
*/
const refusal = async (reason: string, side = order(14000)) => {
  const { ops, log } = opsFor(side, reason)
  const message = await capturePlainStripePayment("order_plain", ops).then(
    () => "DID NOT REJECT",
    (error: Error) => error.message
  )
  return { message, log }
}

describe("a failed capture says only what is known", () => {
  it("an EXPIRED hold, named unmistakably: a payment link", async () => {
    for (const reason of [
      "This PaymentIntent could not be captured because it has already expired.",
      "code: charge_expired_for_capture",
      "The charge has expired for capture",
    ]) {
      const { message } = await refusal(reason)
      expect([reason, /fizetési linket/.test(message), /másik kártyával/.test(message)]).toEqual([reason, true, false])
      expect(message).toContain("a rendelés állapota nem változott")
      expect(message).toContain("a levonás nem történt meg")
      expect(message).toContain(reason.slice(0, 40))
    }
  })

  it("a DECLINED card, named unmistakably: another card", async () => {
    for (const reason of ["Your card was declined.", "code: card_declined"]) {
      const { message } = await refusal(reason)
      expect([reason, /másik kártyával/.test(message), /fizetési linket küldenél|küldj a rendelés oldalán/.test(message)]).toEqual([
        reason,
        true,
        false,
      ])
      expect(message).toContain("a levonás nem történt meg")
    }
  })

  it("ANYTHING ELSE (a timeout, a database error, an already captured): no link advice, no card advice, and LOOK AT STRIPE FIRST, naming the PaymentIntent", async () => {
    for (const reason of [
      "Request timed out after 30000ms",
      "ETIMEDOUT",
      "database is locked",
      "This PaymentIntent has already been captured.",
      "token expired",
      "",
    ]) {
      const { message } = await refusal(reason)
      expect([reason, /küldj a rendelés oldalán fizetési linket/.test(message), /kérd a vevőt, hogy másik kártyával fizessen/.test(message)]).toEqual([
        reason,
        false,
        false,
      ])
      // the head is neutral: "did not come off" would contradict the sentence that follows (barracuda 61130)
      expect([reason, /nem sikerült levonni|nem történt meg/.test(message)]).toEqual([reason, false])
      expect(message).toContain("Nem tudjuk, hogy az összeg a vevő kártyájáról lejött-e")
      expect(message).toContain("nézd meg a Stripe-ban a fizetést (pi_plain)")
      expect(message).toContain("MIELŐTT újra pénzt kérnél")
      expect(message).toContain("a rendelés állapota nem változott")
    }
  })

  it("without a PaymentIntent id the unknown case still says to look in Stripe", async () => {
    const { message } = await refusal("ETIMEDOUT", order(14000, { data: {} }))
    expect(message).toContain("nézd meg a Stripe-ban a fizetést, MIELŐTT")
  })

  it("the provider's text is one short line: no line breaks, at most 200 characters of it", async () => {
    const { message } = await refusal("x".repeat(900))
    expect(message).not.toMatch(/\n/)
    expect(message.match(/x+/)![0].length).toBe(200)
    const multi = await refusal("Your card was declined.\n  Code: card_declined")
    expect(multi.message).toContain("Your card was declined. Code: card_declined")
  })

  it("a successful capture, and the amount-rule refusals, are as before", async () => {
    const { ops, log } = opsFor(order(14000))
    expect(await capturePlainStripePayment("order_plain", ops)).toEqual({ captured: true, amount: 14000 })
    expect(log).toEqual(["capture pay_plain 14000"])
    const unpaid = opsFor(order(20000, { amount: 14000 }))
    await expect(capturePlainStripePayment("order_plain", unpaid.ops)).rejects.not.toThrow(/A kártyás levonás \(/)
    expect(unpaid.log).toEqual([])
  })
})
