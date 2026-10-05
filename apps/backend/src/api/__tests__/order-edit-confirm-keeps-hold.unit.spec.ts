const ops = {
  hold: jest.fn(async () => true),
  release: jest.fn(async () => true),
}
jest.mock("../../workflows/utils/order-edit-hold-operations", () => ({
  editHoldOperations: jest.fn(() => ({
    holdCollection: ops.hold,
    releaseCollection: ops.release,
  })),
}))
jest.mock("../../workflows/utils/order-edit-hold", () => ({
  ...jest.requireActual("../../workflows/utils/order-edit-hold"),
  orderEditHoldDecision: jest.fn(),
}))
const run = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  confirmOrderEditRequestWorkflow: jest.fn(() => ({ run })),
}))

import { orderEditHoldDecision } from "../../workflows/utils/order-edit-hold"
import middlewares from "../middlewares"
import { orderEditConfirmKeepsHold } from "../order-edit-confirm-keeps-hold"

const decide = orderEditHoldDecision as jest.Mock

const call = async () => {
  const res = {
    statusCode: 200,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.sent = body
    },
  }
  const next = jest.fn()
  await orderEditConfirmKeepsHold(
    { params: { id: "order_1" }, scope: {}, auth_context: { actor_id: "user_1" } } as never,
    res as never,
    next
  )
  return { res, next }
}

/**
 * THE ADMIN ORDER EDIT CONFIRM KEEPS AN UNCAPTURED HOLD (order-edit-hold.ts).
 * What must fail: a refused edit reaching Medusa's confirm; a kept hold that
 * also goes on to Medusa's route (it would confirm twice, the second time
 * cancelling the hold); a kept hold answered in another shape than Medusa's
 * route; the guard not on the admin confirm route.
 */
describe("the admin order edit confirm", () => {
  beforeEach(() => {
    decide.mockReset()
    run.mockReset()
    ops.hold.mockClear()
    ops.release.mockClear()
  })

  it("a refused edit stops with 400, nothing else runs", async () => {
    decide.mockResolvedValueOnce({ action: "refuse", message: "többe kerül" })
    const { res, next } = await call()
    expect(res.statusCode).toBe(400)
    expect(res.sent).toEqual({ type: "not_allowed", message: "többe kerül" })
    expect(next).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  it("nothing to keep: Medusa's own route confirms", async () => {
    decide.mockResolvedValueOnce({ action: "pass", reason: "no_card_hold" })
    const { next } = await call()
    expect(next).toHaveBeenCalledTimes(1)
    expect(run).not.toHaveBeenCalled()
  })

  it("an uncaptured hold: Medusa's confirm runs HERE, between hold and release, and answers as Medusa does", async () => {
    decide.mockResolvedValueOnce({ action: "keep_hold", collectionId: "pay_col_1", newTotal: 24300 })
    run.mockImplementationOnce(async () => {
      expect(ops.hold).toHaveBeenCalledWith("pay_col_1")
      expect(ops.release).not.toHaveBeenCalled()
      return { result: { id: "order_1", total: 24300 } }
    })
    const { res, next } = await call()
    expect(run).toHaveBeenCalledWith({ input: { order_id: "order_1", confirmed_by: "user_1" } })
    expect(ops.release).toHaveBeenCalledWith("pay_col_1")
    expect(res.sent).toEqual({ order_preview: { id: "order_1", total: 24300 } })
    expect(next).not.toHaveBeenCalled()
  })

  it("guards the admin confirm route", () => {
    // defineMiddlewares turns `method` into `methods`
    const route = middlewares.routes?.find(
      (entry) =>
        entry.matcher === "/admin/order-edits/:id/confirm" &&
        ((entry as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toEqual([orderEditConfirmKeepsHold])
  })
})
