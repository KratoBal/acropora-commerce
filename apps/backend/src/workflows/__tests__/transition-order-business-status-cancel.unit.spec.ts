import { asValue, createContainer } from "awilix"

const cancelRun = jest.fn()
const refundRun = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  ...jest.requireActual("@medusajs/medusa/core-flows"),
  cancelOrderWorkflow: jest.fn(() => ({ run: cancelRun })),
  refundPaymentWorkflow: jest.fn(() => ({ run: refundRun })),
}))

import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"

/*
  WHAT TURNS THIS RED (card dfb79916): the REAL status-transition workflow not canceling the order when it becomes
  "Sikertelenül lezárt" (the step dropped, or fired AFTER the status change); a refused cancel or refund letting the status
  change anyway; another status canceling; a shipped order blocking the close. Real workflow engine, stand-in container.
*/
const run = async (to: string, order: Record<string, unknown> | null, opts: { cancelFails?: string; refundFails?: string } = {}) => {
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
  const container = createContainer()
  container.register({
    logger: asValue(logger),
    [ORDER_BUSINESS_STATUS_MODULE]: asValue({
      assertTransitionAllowed: async () => void calls.push("assert"),
      transitionOrderBusinessStatus: async (input: { to: string }) => {
        calls.push("transition")
        return { id: "obs_1", status: input.to }
      },
    }),
    query: asValue({ graph: async () => ({ data: order ? [order] : [] }) }),
  })
  const attempt = transitionOrderBusinessStatusWorkflow(container as never).run({
    input: { order_id: "order_1", to: to as never, actor: "admin", source: "admin" },
  })
  return { attempt, calls, logger }
}
/* the workflow engine rejects with the step's error as a plain object (`message`), not an Error: read the message, and fail if it did not reject */
const failureOf = (attempt: Promise<unknown>) =>
  attempt.then(
    () => "DID NOT REJECT",
    (error: { message?: string }) => String(error?.message ?? error),
  )
const unpaid = { id: "order_1", status: "pending", metadata: {}, fulfillments: [], payment_collections: [] }
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

  it("a shipped order still closes, with no cancel and a warning that names what to do by hand", async () => {
    const { attempt, calls, logger } = await run("closed_unsuccessfully", { ...unpaid, fulfillments: [{ canceled_at: null }] })
    await attempt
    expect(calls).not.toContain("cancel")
    expect(calls).toContain("transition")
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("put them back by hand"))
  })
})
