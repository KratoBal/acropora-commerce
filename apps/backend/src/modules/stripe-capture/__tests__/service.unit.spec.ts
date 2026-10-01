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
          return { id: "pi_joint", status, amount: request.amount, currency: "huf" }
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
    expect(out.data.stripe_share).toEqual({ transactionId: "pi_joint", total: 21950, own: 4950 })
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

  it("a shared payment is not captured alone", async () => {
    const { service, stripe } = make("requires_capture")
    await expect(
      service.capturePayment({
        data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 4950 } },
        context: { idempotency_key: "capt_1" },
      })
    ).rejects.toThrow("captured for both together at shipment")
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled()
  })
})
