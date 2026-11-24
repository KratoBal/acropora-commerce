import { Modules } from "@medusajs/framework/utils"
import { asValue, createContainer } from "awilix"

const cancelRun = jest.fn()
const refundRun = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  ...jest.requireActual("@medusajs/medusa/core-flows"),
  cancelOrderWorkflow: jest.fn(() => ({ run: cancelRun })),
  refundPaymentWorkflow: jest.fn(() => ({ run: refundRun })),
}))

import { GIFT_CARD_MODULE } from "../../modules/gift-card"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"

/*
  WHAT TURNS THIS RED (card dfb79916): the REAL status-transition workflow not canceling the order when it becomes
  "Sikertelenül lezárt" (the step dropped, or fired AFTER the status change); a refused cancel or refund letting the status
  change anyway; another status canceling; a shipped order blocking the close. Real workflow engine, stand-in container.
*/
const run = async (
  to: string,
  order: Record<string, unknown> | null,
  opts: { cancelFails?: string; refundFails?: string; current?: string } = {},
) => {
  const calls: string[] = []
  cancelRun.mockReset().mockImplementation(async () => {
    calls.push("cancel")
    if (opts.cancelFails) throw new Error(opts.cancelFails)
    return { result: {} }
  })
  refundRun.mockReset().mockImplementation(async () => {
    calls.push("refund")
    if (opts.refundFails) throw new Error(opts.refundFails)
    return { result: {} }
  })
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const marks: Record<string, unknown>[] = []
  const reverse = jest.fn(async () => ({ balance: 400, points: 400, repeated: false }))
  const refundCard = jest.fn(async () => ({ repeated: false }))
  const container = createContainer()
  container.register({
    logger: asValue(logger),
    [ORDER_BUSINESS_STATUS_MODULE]: asValue({
      assertTransitionAllowed: async () => void calls.push("assert"),
      listOrderBusinessStatusModels: async () => [{ status: opts.current ?? "confirmed" }],
      transitionOrderBusinessStatus: async (input: { to: string }) => {
        calls.push("transition")
        return { id: "obs_1", status: input.to }
      },
    }),
    query: asValue({ graph: async () => ({ data: order ? [order] : [] }) }),
    [Modules.ORDER]: asValue({
      updateOrders: async (rows: { id: string; metadata: Record<string, unknown> }[]) => {
        calls.push("mark")
        marks.push(rows[0].metadata)
      },
    }),
    [LOYALTY_MODULE]: asValue({ reversePointsRedemption: reverse }),
    [GIFT_CARD_MODULE]: asValue({ refundGiftCard: refundCard }),
  })
  const attempt = transitionOrderBusinessStatusWorkflow(container as never).run({
    input: { order_id: "order_1", to: to as never, actor: "admin", source: "admin" },
  })
  return { attempt, calls, logger, reverse, refundCard, marks }
}
/* the workflow engine rejects with the step's error as a plain object (`message`), not an Error: read the message, and fail if it did not reject */
const failureOf = (attempt: Promise<unknown>) =>
  attempt.then(
    () => "DID NOT REJECT",
    (error: { message?: string }) => String(error?.message ?? error),
  )
const credit_lines = [
  { id: "cl_p", amount: 400, reference: "loyalty_points", reference_id: "cus_1", metadata: { points: 400, cart_id: "cart_1" } },
  { id: "cl_g", amount: 5000, reference: "gift_card", reference_id: "gc_1", metadata: { cart_id: "cart_1" } },
]
const unpaid = { id: "order_1", status: "pending", metadata: {}, fulfillments: [], payment_collections: [], credit_lines }
const paid = {
  ...unpaid,
  payment_collections: [{ payments: [{ id: "pay_1", data: {}, canceled_at: null, captures: [{ amount: 500 }], refunds: [] }] }],
}

describe("transitionOrderBusinessStatusWorkflow cancels the order on an unsuccessful close", () => {
  it("cancels BEFORE the status changes", async () => {
    const { attempt, calls } = await run("closed_unsuccessfully", unpaid)
    expect(await attempt).toMatchObject({ result: { status: "closed_unsuccessfully" } })
    expect(calls).toEqual(expect.arrayContaining(["cancel", "transition"]))
    expect(calls.indexOf("cancel")).toBeLessThan(calls.indexOf("transition"))
  })

  it("refunds what was captured first, then cancels, then changes the status", async () => {
    const { attempt, calls } = await run("closed_unsuccessfully", paid)
    await attempt
    expect(calls.filter((c) => c !== "assert")).toEqual(["refund", "cancel", "transition"])
  })

  it("a refused cancel stops the move: the status does NOT change", async () => {
    const { attempt, calls } = await run("closed_unsuccessfully", unpaid, { cancelFails: "cannot cancel" })
    expect(await failureOf(attempt)).toMatch(/nincs lemondva/)
    expect(calls).not.toContain("transition")
  })

  it("a refused refund stops the move: no cancel, the status does NOT change", async () => {
    const { attempt, calls } = await run("closed_unsuccessfully", paid, { refundFails: "Stripe refused" })
    expect(await failureOf(attempt)).toMatch(/Stripe refused/)
    expect(calls).not.toContain("cancel")
    expect(calls).not.toContain("transition")
  })

  it("any other status cancels nothing", async () => {
    const { attempt, calls } = await run("confirmed", unpaid)
    await attempt
    expect(calls).not.toContain("cancel")
    expect(calls).toContain("transition")
  })

  it("a shipped order (the returned parcel, the MAIN case) still closes: no cancel, the points and the card share given back directly", async () => {
    const { attempt, calls, logger, reverse, refundCard } = await run("closed_unsuccessfully", { ...unpaid, fulfillments: [{ canceled_at: null }] })
    await attempt
    expect(calls).not.toContain("cancel")
    expect(calls).toContain("transition")
    expect(reverse).toHaveBeenCalledWith({ customer_id: "cus_1", cart_id: "cart_1", order_id: "order_1" })
    expect(refundCard).toHaveBeenCalledWith({ gift_card_id: "gc_1", amount: 5000, reference: "cart_1", key: "cancel:order_1:cl_g" })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("given back directly"))
  })

  it("the direct give-back leaves the marker on the order, with the credit lines and the hand-refund amount", async () => {
    const { attempt, marks } = await run("closed_unsuccessfully", {
      ...paid,
      fulfillments: [{ canceled_at: null }],
    })
    await attempt
    expect(marks).toHaveLength(1)
    expect(marks[0]).toMatchObject({ unsuccessful_close_credits_given_back: { credit_lines: 2, captured_unrefunded: 500 } })
  })

  it("the cancelable order's credits are NOT given back here: the order.canceled subscribers do it once, from the cancel", async () => {
    const { attempt, reverse, refundCard } = await run("closed_unsuccessfully", unpaid)
    await attempt
    expect(reverse).not.toHaveBeenCalled()
    expect(refundCard).not.toHaveBeenCalled()
  })

  it("a give-back that fails does not stop the close, and is logged with what to put back by hand", async () => {
    const { attempt, logger, reverse } = await run("closed_unsuccessfully", { ...unpaid, fulfillments: [{ canceled_at: null }] })
    reverse.mockRejectedValueOnce(new Error("ledger down"))
    expect(await attempt).toMatchObject({ result: { status: "closed_unsuccessfully" } })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Put them back by hand"))
  })

  describe("the way back (closed_unsuccessfully -> stocking)", () => {
    it("is refused for a canceled order, and the status does NOT change", async () => {
      const { attempt, calls } = await run("stocking", { ...unpaid, status: "canceled" }, { current: "closed_unsuccessfully" })
      expect(await failureOf(attempt)).toMatch(/le lett mondva.*új rendelés kell/)
      expect(calls).not.toContain("transition")
    })

    it("is refused for an order whose close gave the points and the card back (the marker)", async () => {
      const marked = { ...unpaid, metadata: { unsuccessful_close_credits_given_back: { credit_lines: 2, captured_unrefunded: 0 } } }
      const { attempt, calls } = await run("stocking", marked, { current: "closed_unsuccessfully" })
      expect(await failureOf(attempt)).toMatch(/visszajárt.*új rendelés kell/)
      expect(calls).not.toContain("transition")
    })

    it("an order the close moved nothing on (an old label-only close) still reopens", async () => {
      const { attempt, calls } = await run("stocking", unpaid, { current: "closed_unsuccessfully" })
      await attempt
      expect(calls).toContain("transition")
    })

    it("a move into Készletezés from any other status is not looked at", async () => {
      const { attempt, calls } = await run("stocking", { ...unpaid, status: "canceled" }, { current: "confirmed" })
      await attempt
      expect(calls).toContain("transition")
    })
  })
})
