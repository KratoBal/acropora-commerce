import { asValue, createContainer } from "awilix"

const ops = {
  loadPair: jest.fn(),
  setPaymentData: jest.fn(),
  capture: jest.fn(),
}
jest.mock("../utils/shared-stripe-capture-operations", () => ({
  sharedCaptureOperations: () => ops,
}))

import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"
import { DIFFERENCE_UNPAID } from "../utils/order-payment/state"
import { STRIPE_PROVIDER_ID } from "../utils/stripe-config"

/*
  WHAT TURNS THIS RED (card d4a1d99d; measured on the test shop 2026-11-25: a Stripe card order went Készletezés -> Átvehető -> Lezárva with its
  hold UNCAPTURED): the REAL status-transition workflow closing a plain card order without capturing it; the capture after the status change;
  a refused capture letting the status change; a capture of an order that is not a plain card order, or one already captured; any other
  status capturing. Real workflow engine, stand-in container, stand-in capture operations.
*/
const side = (over: Record<string, unknown> = {}, paymentOver: Record<string, unknown> | null = {}) => ({
  order_id: "order_1",
  total: 14000,
  currency_code: "huf",
  payment:
    paymentOver === null
      ? null
      : { id: "pay_1", amount: 14000, captured: 0, provider_id: STRIPE_PROVIDER_ID, data: { id: "pi_1" }, ...paymentOver },
  ...over,
})

const run = async (to: string, pair: ReturnType<typeof side> | null) => {
  const calls: string[] = []
  ops.loadPair.mockReset().mockImplementation(async () => (pair ? { shipped: pair, pickup: null } : null))
  ops.capture.mockReset().mockImplementation(async (id: string, amount: number) => void calls.push(`capture ${id} ${amount}`))
  ops.setPaymentData.mockReset().mockResolvedValue(undefined)
  const container = createContainer()
  container.register({
    // the order's payment lock (card efcd5add): one run here, so it only passes the job through
    locking: asValue({ execute: async (_key: unknown, job: () => Promise<unknown>) => job() }),
    logger: asValue({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
    [ORDER_BUSINESS_STATUS_MODULE]: asValue({
      assertTransitionAllowed: async () => void calls.push("assert"),
      listOrderBusinessStatusModels: async () => [{ status: "ready_for_pickup" }],
      transitionOrderBusinessStatus: async (input: { to: string }) => {
        calls.push("transition")
        return { id: "obs_1", status: input.to }
      },
    }),
    query: asValue({ graph: async () => ({ data: [{ id: "order_1", total: 14000, items: [], credit_line_total: 0 }] }) }),
    loyalty: asValue({ accruePoints: async () => ({ balance: 0, points: 0, repeated: false }) }),
    commerceSettings: asValue({ listCommerceSettings: async () => [] }),
  })
  const attempt = transitionOrderBusinessStatusWorkflow(container as never).run({
    input: { order_id: "order_1", to: to as never, actor: "admin", source: "admin" },
  })
  return { attempt, calls }
}
const failureOf = (attempt: Promise<unknown>) =>
  attempt.then(
    () => "DID NOT REJECT",
    (error: { message?: string }) => String(error?.message ?? error)
  )

describe("closing a plain card order captures it first", () => {
  it("captures the order's total BEFORE the status changes", async () => {
    const { attempt, calls } = await run("closed", side())
    expect(await attempt).toMatchObject({ result: { status: "closed" } })
    expect(calls).toContain("capture pay_1 14000")
    expect(calls.indexOf("capture pay_1 14000")).toBeLessThan(calls.indexOf("transition"))
  })

  it("a refused capture stops the close: the status does NOT change, and the sentence says why", async () => {
    // the hold is smaller than the total: the difference is unpaid
    const { attempt, calls } = await run("closed", side({ total: 20000 }, { amount: 14000 }))
    expect(await failureOf(attempt)).toBe(DIFFERENCE_UNPAID)
    expect(calls).not.toContain("transition")
    expect(calls.some((line) => line.startsWith("capture"))).toBe(false)
  })

  it("a capture the card provider refuses stops the close with the next-step sentence, and the status does NOT change (card 23ebb2a2)", async () => {
    const calls: string[] = []
    ops.loadPair.mockReset().mockResolvedValue({ shipped: side(), pickup: null })
    ops.setPaymentData.mockReset().mockResolvedValue(undefined)
    ops.capture.mockReset().mockRejectedValue(new Error("This PaymentIntent could not be captured because it has already expired."))
    const container = createContainer()
    container.register({
      // the order's payment lock (card efcd5add): one run here, so it only passes the job through
      locking: asValue({ execute: async (_key: unknown, job: () => Promise<unknown>) => job() }),
      logger: asValue({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
      [ORDER_BUSINESS_STATUS_MODULE]: asValue({
        assertTransitionAllowed: async () => void calls.push("assert"),
        listOrderBusinessStatusModels: async () => [],
        transitionOrderBusinessStatus: async () => void calls.push("transition"),
      }),
    })
    const message = await failureOf(
      transitionOrderBusinessStatusWorkflow(container as never).run({
        input: { order_id: "order_1", to: "closed" as never, actor: "admin", source: "admin" },
      })
    )
    expect(message).toContain("A kártyás levonás (14000 Ft) hibát jelzett")
    expect(message).toContain("has already expired")
    expect(message).toMatch(/fizetési linket/)
    expect(calls).not.toContain("transition")
  })

  it("an UNKNOWN capture error (the answer timed out: the card may be charged) stops the close and says to look at Stripe, never to ask for money again", async () => {
    const calls: string[] = []
    ops.loadPair.mockReset().mockResolvedValue({ shipped: side(), pickup: null })
    ops.setPaymentData.mockReset().mockResolvedValue(undefined)
    ops.capture.mockReset().mockRejectedValue(new Error("Request timed out after 30000ms"))
    const container = createContainer()
    container.register({
      // the order's payment lock (card efcd5add): one run here, so it only passes the job through
      locking: asValue({ execute: async (_key: unknown, job: () => Promise<unknown>) => job() }),
      logger: asValue({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
      [ORDER_BUSINESS_STATUS_MODULE]: asValue({
        assertTransitionAllowed: async () => void calls.push("assert"),
        listOrderBusinessStatusModels: async () => [],
        transitionOrderBusinessStatus: async () => void calls.push("transition"),
      }),
    })
    const message = await failureOf(
      transitionOrderBusinessStatusWorkflow(container as never).run({
        input: { order_id: "order_1", to: "closed" as never, actor: "admin", source: "admin" },
      })
    )
    expect(message).toContain("nézd meg a Stripe-ban a fizetést (pi_1)")
    expect(message).not.toMatch(/küldj a rendelés oldalán fizetési linket/)
    expect(calls).not.toContain("transition")
  })

  it("an order already captured (it went out through Kiszállítás) is closed with no second capture", async () => {
    const { attempt, calls } = await run("closed", side({}, { captured: 14000 }))
    await attempt
    expect(calls.some((line) => line.startsWith("capture"))).toBe(false)
    expect(calls).toContain("transition")
  })

  it("cash on delivery (or any other provider) is closed with no capture", async () => {
    const { attempt, calls } = await run("closed", side({}, { provider_id: "pp_acropora_cod" }))
    await attempt
    expect(calls.some((line) => line.startsWith("capture"))).toBe(false)
    expect(calls).toContain("transition")
  })

  it("a close that the status table refuses takes no money", async () => {
    // the stand-in status module refuses by throwing from assertTransitionAllowed
    const calls: string[] = []
    ops.loadPair.mockReset().mockResolvedValue({ shipped: side(), pickup: null })
    ops.capture.mockReset().mockImplementation(async () => void calls.push("capture"))
    const container = createContainer()
    container.register({
      // the order's payment lock (card efcd5add): one run here, so it only passes the job through
      locking: asValue({ execute: async (_key: unknown, job: () => Promise<unknown>) => job() }),
      logger: asValue({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
      [ORDER_BUSINESS_STATUS_MODULE]: asValue({
        assertTransitionAllowed: async () => {
          throw new Error("confirmed cannot transition to closed")
        },
        listOrderBusinessStatusModels: async () => [],
        transitionOrderBusinessStatus: async () => void calls.push("transition"),
      }),
    })
    const message = await failureOf(
      transitionOrderBusinessStatusWorkflow(container as never).run({
        input: { order_id: "order_1", to: "closed" as never, actor: "admin", source: "admin" },
      })
    )
    expect(message).toMatch(/cannot transition/)
    expect(calls).toEqual([])
  })

  it("any other status captures nothing", async () => {
    for (const to of ["confirmed", "stocking", "ready_for_pickup"]) {
      const { attempt, calls } = await run(to, side())
      await attempt
      expect([to, calls.some((line) => line.startsWith("capture"))]).toEqual([to, false])
    }
  })
})
