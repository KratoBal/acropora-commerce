import AcroporaStripeService from "../service"
import { smallestUnit } from "../smallest-unit"

/**
 * THE CAPTURE TAKES THE AMOUNT MEDUSA BOOKS (Balázs 2026-10-01 04:44 UTC).
 *
 * What must fail: the capture without `amount_to_capture` (the stock behaviour:
 * Stripe takes the whole authorization); an amount from anywhere but the
 * capture record; the amount in another unit than the intent's; a second
 * capture booked while Stripe takes nothing; a missing capture record not
 * refused.
 */
const intent = (over: Record<string, unknown> = {}) => ({
  id: "pi_1",
  status: "requires_capture",
  currency: "huf",
  amount_capturable: 1_200_000, // 12 000 Ft
  amount_received: 0,
  ...over,
})

const make = (opts: {
  amount?: number
  intent?: Record<string, unknown>
  capture?: jest.Mock
  cradle?: Record<string, unknown>
}) => {
  const retrieveRecord = jest.fn(async (id: string) => ({ id, amount: opts.amount ?? 9000 }))
  const cradle =
    opts.cradle ?? ({ captureService: { retrieve: retrieveRecord } } as Record<string, unknown>)
  const service = new AcroporaStripeService(cradle, { apiKey: "sk_test_helyi_proba" })
  const capture =
    opts.capture ??
    jest.fn(async (_id: string, params: { amount_to_capture: number }) => ({
      ...intent(),
      status: "succeeded",
      amount_received: params.amount_to_capture,
      amount_capturable: 0,
    }))
  ;(service as any).stripe_ = {
    paymentIntents: {
      retrieve: jest.fn(async () => intent(opts.intent)),
      capture,
    },
  }
  return { service, capture, retrieveRecord }
}

describe("AcroporaStripeService.capturePayment", () => {
  it("captures the booked, smaller amount, keyed by the capture record", async () => {
    const { service, capture, retrieveRecord } = make({ amount: 9000 })

    const out = await service.capturePayment({
      data: { id: "pi_1" },
      context: { idempotency_key: "capt_1" },
    })

    expect(retrieveRecord).toHaveBeenCalledWith("capt_1", { select: ["id", "amount"] })
    expect(capture).toHaveBeenCalledWith(
      "pi_1",
      { amount_to_capture: 900_000 },
      { idempotencyKey: "capt_1" }
    )
    expect(out.data.amount_received).toBe(900_000)
  })

  it("the whole amount when nothing dropped out", async () => {
    const { service, capture } = make({ amount: 12000 })
    await service.capturePayment({ data: { id: "pi_1" }, context: { idempotency_key: "capt_1" } })
    expect(capture.mock.calls[0][1]).toEqual({ amount_to_capture: 1_200_000 })
  })

  it("refuses more than the authorization, without calling Stripe's capture", async () => {
    const { service, capture } = make({ amount: 12001 })
    await expect(
      service.capturePayment({ data: { id: "pi_1" }, context: { idempotency_key: "capt_1" } })
    ).rejects.toThrow("cannot be captured")
    expect(capture).not.toHaveBeenCalled()
  })

  it("a second capture on a captured payment is refused (Stripe refuses the new key)", async () => {
    const capture = jest.fn(async () => {
      throw new Error("payment_intent_unexpected_state")
    })
    const { service } = make({
      amount: 3000,
      intent: { status: "succeeded", amount_received: 900_000, amount_capturable: 0 },
      capture,
    })
    await expect(
      service.capturePayment({ data: { id: "pi_1" }, context: { idempotency_key: "capt_2" } })
    ).rejects.toThrow("already captured once")
    expect(capture).toHaveBeenCalledWith(
      "pi_1",
      { amount_to_capture: 300_000 },
      { idempotencyKey: "capt_2" }
    )
  })

  it("the same capture retried gets Stripe's replay", async () => {
    const capture = jest.fn(async () => ({ ...intent(), status: "succeeded", amount_received: 900_000 }))
    const { service } = make({
      amount: 9000,
      intent: { status: "succeeded", amount_received: 900_000, amount_capturable: 0 },
      capture,
    })
    const out = await service.capturePayment({
      data: { id: "pi_1" },
      context: { idempotency_key: "capt_1" },
    })
    expect(out.data.amount_received).toBe(900_000)
  })

  it("no capture record to read: refused, the constructor does not throw", async () => {
    const throwing = new Proxy(
      {},
      {
        get: () => {
          throw new Error("Could not resolve 'captureService'")
        },
      }
    )
    const { service, capture } = make({ cradle: throwing as Record<string, unknown> })
    await expect(
      service.capturePayment({ data: { id: "pi_1" }, context: { idempotency_key: "capt_1" } })
    ).rejects.toThrow("no capture record")
    expect(capture).not.toHaveBeenCalled()
  })

  it("no idempotency key: refused", async () => {
    const { service, capture } = make({})
    await expect(service.capturePayment({ data: { id: "pi_1" }, context: {} })).rejects.toThrow(
      "no capture record"
    )
    expect(capture).not.toHaveBeenCalled()
  })
})

describe("smallestUnit (as the stock provider creates the intent)", () => {
  it("HUF and EUR in hundredths, JPY whole, KWD in thousandths rounded up to ten", () => {
    expect(smallestUnit(1000, "huf")).toBe(100_000)
    expect(smallestUnit(12.34, "EUR")).toBe(1234)
    expect(smallestUnit(500, "jpy")).toBe(500)
    expect(smallestUnit(1.2345, "KWD")).toBe(1240)
  })
})

describe("smallestUnit equals the package's own conversion", () => {
  /*
    THE PACKAGE'S FUNCTION ITSELF, through the path @medusajs/medusa exports
    (`discoveryPath`): if a later version changes the table, this turns red
    instead of the capture silently taking another amount than the intent.
  */
  it("on a spread of amounts and currencies", () => {
    const { discoveryPath } = require("@medusajs/medusa/payment-stripe") as {
      discoveryPath: string
    }
    const { getSmallestUnit } = require(
      require("path").join(require("path").dirname(discoveryPath), "utils/get-smallest-unit")
    ) as { getSmallestUnit: (amount: number, currency: string) => number }

    for (const currency of ["huf", "eur", "usd", "jpy", "kwd", "bhd"]) {
      for (const amount of [0.01, 1, 9.995, 12.34, 999, 1000, 4567.891, 12000]) {
        expect([currency, amount, smallestUnit(amount, currency)]).toEqual([
          currency,
          amount,
          getSmallestUnit(amount, currency),
        ])
      }
    }
  })
})

/**
 * ONE STRIPE PAYMENT FOR BOTH ORDERS OF A MIXED CART (Balázs 2026-10-01,
 * variant 1). What must fail: the shipped session's intent not for the two
 * carts together; the pickup session making a second intent, or joining with
 * parts that do not add up; the share facts lost on authorize; a shared
 * session following one cart's new amount; the pickup session cancelling the
 * shared intent; a shared payment captured alone.
 */
describe("the shared Stripe payment", () => {
  const fakeStripe = (status = "requires_payment_method") => {
    const created: Record<string, unknown>[] = []
    const stripe = {
      paymentIntents: {
        create: jest.fn(async (request: Record<string, unknown>) => {
          created.push(request)
          return {
            id: "pi_joint",
            status,
            amount: request.amount,
            currency: "huf",
            client_secret: "pi_joint_secret_x",
          }
        }),
        retrieve: jest.fn(async (id: string) => ({ id, status, amount: 2_195_000, currency: "huf" })),
        update: jest.fn(async (id: string, params: Record<string, unknown>) => ({ id, status, ...params })),
        cancel: jest.fn(async (id: string) => ({ id, status: "canceled" })),
        capture: jest.fn(),
      },
    }
    return { stripe, created }
  }
  const make = (status?: string) => {
    const service = new AcroporaStripeService(
      { captureService: { retrieve: jest.fn() } },
      { apiKey: "sk_test_helyi_proba" }
    )
    const { stripe, created } = fakeStripe(status)
    ;(service as any).stripe_ = stripe
    return { service, stripe, created }
  }

  it("the shipped session starts one intent for both carts, and records its own part", async () => {
    const { service, created } = make()
    const out = await service.initiatePayment({
      amount: 4950,
      currency_code: "huf",
      data: { stripe_joint: { total: 21950 }, session_id: "payses_1" },
    })
    expect(created[0].amount).toBe(2_195_000)
    expect(created[0]).not.toHaveProperty("stripe_joint")
    expect(out.data.stripe_share).toEqual({
      transactionId: "pi_joint",
      total: 21950,
      own: 4950,
      clientSecret: "pi_joint_secret_x",
    })
  })

  it("the pickup session joins the intent, makes none, and its part must add up", async () => {
    const { service, stripe } = make("requires_capture")
    const out = await service.initiatePayment({
      amount: 17000,
      currency_code: "huf",
      data: { stripe_joined: { transactionId: "pi_joint", total: 21950, own: 4950 } },
    })
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
    expect(out.id).toBe("pi_joint")
    expect(out.status).toBe("authorized")
    expect(out.data).toEqual({
      id: "pi_joint",
      stripe_share: { transactionId: "pi_joint", total: 21950, own: 17000, joined: true },
    })

    await expect(
      service.initiatePayment({
        amount: 16000,
        currency_code: "huf",
        data: { stripe_joined: { transactionId: "pi_joint", total: 21950, own: 4950 } },
      })
    ).rejects.toThrow("exactly the two carts together")
  })

  it("authorize keeps the share facts", async () => {
    const { service } = make("requires_capture")
    const share = { transactionId: "pi_joint", total: 21950, own: 17000, joined: true }
    const out = await service.authorizePayment({ data: { id: "pi_joint", stripe_share: share } })
    expect(out.status).toBe("authorized")
    expect(out.data.stripe_share).toEqual(share)
  })

  it("a shared session keeps its amount, refuses a new one, and leaves the intent alone", async () => {
    const { service, stripe } = make()
    const data = { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 4950 } }
    expect(await service.updatePayment({ amount: 4950, currency_code: "huf", data })).toEqual({ data })
    await expect(
      service.updatePayment({ amount: 5000, currency_code: "huf", data })
    ).rejects.toThrow("start the payment again")
    expect(stripe.paymentIntents.update).not.toHaveBeenCalled()
  })

  it("dropping the pickup session does not cancel the shared intent; the shipped one does", async () => {
    const { service, stripe } = make()
    await service.cancelPayment({
      data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 17000, joined: true } },
    })
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled()
    await service.cancelPayment({
      data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 4950 } },
    })
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1)
  })

})

/**
 * ONE CAPTURE FOR BOTH ORDERS, at "Kiszállítás" (Balázs 2026-10-01, variant
 * 1). What must fail: a shared payment captured without the parts (one order
 * alone); the shipped payment's capture not taking the SUM in one Stripe call,
 * or not recording the parts; the pickup payment booked without its recorded
 * part, or for another amount; parts that do not add up, or exceed the hold.
 */
describe("capturing the shared Stripe payment", () => {
  const SHARE = { transactionId: "pi_joint", total: 21950, own: 4950 }
  const make = (opts: {
    record: { amount: number; payment_id: string }
    status: string
    metadata?: Record<string, string>
    capturable?: number
  }) => {
    const service = new AcroporaStripeService(
      { captureService: { retrieve: jest.fn(async () => ({ id: "capt_1", ...opts.record })) } },
      { apiKey: "sk_test_helyi_proba" }
    )
    const stripe = {
      paymentIntents: {
        retrieve: jest.fn(async () => ({
          id: "pi_joint",
          status: opts.status,
          currency: "huf",
          amount_capturable: opts.capturable ?? 2_195_000,
          metadata: opts.metadata ?? {},
        })),
        update: jest.fn(async () => ({})),
        capture: jest.fn(async (id: string) => ({ id, status: "succeeded" })),
      },
    }
    ;(service as any).stripe_ = stripe
    return { service, stripe }
  }
  const PARTS = { total: 2_100_000, parts: { pay_ship: 400_000, pay_pick: 1_700_000 } }

  it("without the parts, a shared payment is not captured (one order alone)", async () => {
    const { service, stripe } = make({ record: { amount: 4950, payment_id: "pay_ship" }, status: "requires_capture" })
    await expect(
      service.capturePayment({
        data: { id: "pi_joint", stripe_share: SHARE },
        context: { idempotency_key: "capt_1" },
      })
    ).rejects.toThrow("captured for both together at shipment")
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled()
  })

  it("the shipped payment takes the sum in ONE Stripe capture, and records both parts", async () => {
    const { service, stripe } = make({ record: { amount: 4000, payment_id: "pay_ship" }, status: "requires_capture" })
    const out = await service.capturePayment({
      data: { id: "pi_joint", stripe_share: SHARE, stripe_capture_parts: PARTS },
      context: { idempotency_key: "capt_1" },
    })
    expect(stripe.paymentIntents.update).toHaveBeenCalledWith("pi_joint", {
      metadata: { "a:pay_ship": "400000", "a:pay_pick": "1700000" },
    })
    expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(1)
    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
      "pi_joint",
      { amount_to_capture: 2_100_000 },
      { idempotencyKey: "capt_1" }
    )
    expect(out.data.stripe_share).toEqual(SHARE)
  })

  it("the pickup payment books its recorded part, without a second Stripe capture", async () => {
    const { service, stripe } = make({
      record: { amount: 17000, payment_id: "pay_pick" },
      status: "succeeded",
      metadata: { "a:pay_ship": "400000", "a:pay_pick": "1700000" },
    })
    const out = await service.capturePayment({
      data: { id: "pi_joint", stripe_share: { ...SHARE, own: 17000, joined: true } },
      context: { idempotency_key: "capt_2" },
    })
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled()
    expect(out.data.stripe_share).toEqual({ ...SHARE, own: 17000, joined: true })
  })

  it("a booked amount that is not the recorded part is refused", async () => {
    const { service } = make({
      record: { amount: 17500, payment_id: "pay_pick" },
      status: "succeeded",
      metadata: { "a:pay_pick": "1700000" },
    })
    await expect(
      service.capturePayment({
        data: { id: "pi_joint", stripe_share: { ...SHARE, own: 17000, joined: true } },
        context: { idempotency_key: "capt_2" },
      })
    ).rejects.toThrow("captured for both together at shipment")
  })

  it("parts that do not add up, or exceed the hold, are refused before Stripe", async () => {
    const wrong = make({ record: { amount: 4000, payment_id: "pay_ship" }, status: "requires_capture" })
    await expect(
      wrong.service.capturePayment({
        data: { id: "pi_joint", stripe_share: SHARE, stripe_capture_parts: { ...PARTS, total: 2_000_000 } },
        context: { idempotency_key: "capt_1" },
      })
    ).rejects.toThrow("cannot be captured")
    const over = make({ record: { amount: 4000, payment_id: "pay_ship" }, status: "requires_capture", capturable: 2_000_000 })
    await expect(
      over.service.capturePayment({
        data: { id: "pi_joint", stripe_share: SHARE, stripe_capture_parts: PARTS },
        context: { idempotency_key: "capt_1" },
      })
    ).rejects.toThrow("cannot be captured")
    expect(wrong.stripe.paymentIntents.capture).not.toHaveBeenCalled()
    expect(over.stripe.paymentIntents.capture).not.toHaveBeenCalled()
  })
})

/**
 * AN ANIMAL DROPPED AFTER "KISZÁLLÍTÁS" IS A REFUND on the shared intent, for
 * the amount refunded (Balázs 2026-10-01). What must fail: the pickup's refund
 * aimed elsewhere than the shared intent, or for another amount.
 */
describe("refunding the pickup's part of the shared payment", () => {
  it("refunds the amount on the shared intent", async () => {
    // a közös fizetés visszatérítése 2026-10-01 óta a saját útján megy (a
    // fizetésenkénti pontos határ, lásd a refundPayment-blokkot alább)
    const service = new AcroporaStripeService(
      {
        captureService: { retrieve: jest.fn() },
        refundService: { retrieve: jest.fn(async (id: string) => ({ id, payment_id: "pay_pick" })) },
      },
      { apiKey: "sk_test_helyi_proba" }
    )
    const refunds = {
      create: jest.fn(async () => ({ id: "re_1" })),
      list: jest.fn(async () => ({ data: [] })),
    }
    ;(service as any).stripe_ = {
      refunds,
      paymentIntents: {
        retrieve: jest.fn(async () => ({ id: "pi_joint", currency: "huf", metadata: { "a:pay_pick": "1700000" } })),
      },
    }
    await service.refundPayment({
      amount: 8500,
      data: {
        id: "pi_joint",
        currency: "huf",
        stripe_share: { transactionId: "pi_joint", total: 21950, own: 17000, joined: true },
      },
      context: { idempotency_key: "ref_1" },
    })
    expect(refunds.create).toHaveBeenCalledWith(
      {
        amount: 850_000,
        payment_intent: "pi_joint",
        metadata: { acropora_payment: "pay_pick", acropora_refund: "ref_1" },
      },
      { idempotencyKey: "ref_1" }
    )
  })
})

/*
  THE `succeeded` WEBHOOK AFTER OUR OWN CAPTURE (acrobot 25657). MI PIROSÍT: ha
  egy kisebb levonás vagy a vegyes kosár közös levonása után a webhook még egy
  levonást kérne; ha egy teljes, egy fizetéses levonás (például a Stripe
  felületéről) nem jutna el a Medusáig; ha a többi esemény is elnémulna.
*/
describe("AcroporaStripeService webhook", () => {
  const event = (type: string, object: Record<string, unknown>) => {
    const { service } = make({})
    ;(service as any).constructWebhookEvent = () => ({
      type,
      data: {
        object: {
          id: "pi_1",
          currency: "huf",
          amount: 2_780_000,
          amount_received: 2_780_000,
          amount_capturable: 0,
          metadata: { session_id: "payses_1" },
          ...object,
        },
      },
    })
    return service.getWebhookActionAndData({ data: {}, rawData: "", headers: {} })
  }

  it("a smaller capture than the hold is left out", async () => {
    expect((await event("payment_intent.succeeded", { amount_received: 1_730_000 })).action).toBe(
      "not_supported"
    )
  })

  it("a mixed cart's shared capture is left out, even at the full amount", async () => {
    const result = await event("payment_intent.succeeded", {
      metadata: { session_id: "payses_1", "a:pay_ship": "1730000", "a:pay_pick": "1050000" },
    })
    expect(result.action).toBe("not_supported")
  })

  it("a full capture of one payment still reaches Medusa, and other events too", async () => {
    expect((await event("payment_intent.succeeded", {})).action).toBe("captured")
    expect((await event("payment_intent.amount_capturable_updated", { amount_capturable: 2_780_000 })).action).toBe(
      "authorized"
    )
  })
})

/*
  A KÖZÖS INTENT VISSZATÉRÍTÉSE RENDELÉSENKÉNT, EGYSÉGRE PONTOSAN (acrobot 25694,
  stage #24/#25: +1 Ft a #24-ről a #25 részéből ment el). MI PIROSÍT: ha a levont
  részen túl, akár 1 egységgel, visszatérítene; ha a másik fizetés vagy a
  felszabadított maradék visszatérítése a határba számítana; ha egy újrapróbált
  visszatérítés kétszer menne ki; ha a visszatérítés nem vinné a fizetést és a
  Medusa-rekordot a metadatában; ha a nem közös fizetés útja megváltozna.
*/
describe("AcroporaStripeService.refundPayment", () => {
  const SHARED = { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 7459, own: 5199 } }
  const makeRefund = (opts: { refunds?: Record<string, unknown>[]; payment?: string; parts?: Record<string, string> }) => {
    const service = new AcroporaStripeService(
      {
        captureService: { retrieve: jest.fn() },
        refundService: { retrieve: jest.fn(async (id: string) => ({ id, payment_id: opts.payment ?? "pay_ship" })) },
      },
      { apiKey: "sk_test_helyi_proba" }
    )
    const create = jest.fn(async (params: Record<string, unknown>) => ({ id: "re_new", ...params }))
    ;(service as any).stripe_ = {
      paymentIntents: {
        retrieve: jest.fn(async () => ({
          id: "pi_joint",
          currency: "huf",
          metadata: opts.parts ?? { "a:pay_ship": "519900", "a:pay_pick": "226000" },
        })),
      },
      refunds: { list: jest.fn(async () => ({ data: opts.refunds ?? [] })), create },
    }
    return { service, create }
  }
  const refund = (service: any, amount: number, id = "ref_1") =>
    service.refundPayment({ amount, data: SHARED, context: { idempotency_key: id } })

  it("refunds within the order's own captured part, marked with the payment and the record", async () => {
    const { service, create } = makeRefund({})
    await refund(service, 33)
    expect(create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_joint",
        amount: 3300,
        metadata: { acropora_payment: "pay_ship", acropora_refund: "ref_1" },
      },
      { idempotencyKey: "ref_1" }
    )
  })

  it("refuses even one unit beyond the order's part, though the shared intent has room", async () => {
    const { service, create } = makeRefund({
      refunds: [{ amount: 519900, status: "succeeded", metadata: { acropora_payment: "pay_ship", acropora_refund: "ref_0" } }],
    })
    await expect(refund(service, 1)).rejects.toThrow("Ennyi nem téríthető vissza")
    expect(create).not.toHaveBeenCalled()
  })

  it("the other order's refunds and the released rest do not count against this order", async () => {
    const { service, create } = makeRefund({
      refunds: [
        { amount: 226000, status: "succeeded", metadata: { acropora_payment: "pay_pick", acropora_refund: "ref_p" } },
        { amount: 1050000, status: "succeeded", metadata: {} },
      ],
    })
    await refund(service, 5199)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it("a retried refund is not sent twice", async () => {
    const { service, create } = makeRefund({
      refunds: [{ amount: 3300, status: "succeeded", metadata: { acropora_payment: "pay_ship", acropora_refund: "ref_1" } }],
    })
    await refund(service, 33, "ref_1")
    expect(create).not.toHaveBeenCalled()
  })

  it("a payment that is not shared keeps the stock refund", async () => {
    const { service, create } = makeRefund({})
    await service.refundPayment({ amount: 33, data: { id: "pi_single", currency: "huf" }, context: { idempotency_key: "ref_s" } })
    expect(create).toHaveBeenCalledWith({ amount: 3300, payment_intent: "pi_single" }, { idempotencyKey: "ref_s" })
  })
})
