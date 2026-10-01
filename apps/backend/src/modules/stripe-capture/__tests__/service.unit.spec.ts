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
