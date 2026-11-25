const ops = {
  hold: jest.fn(async () => true),
  release: jest.fn(async () => true),
  closeOthers: jest.fn(async () => undefined),
}
jest.mock("../../workflows/utils/order-edit-hold-operations", () => ({
  editHoldOperations: jest.fn(() => ({
    holdCollection: ops.hold,
    releaseCollection: ops.release,
    closeOtherOpenCollections: ops.closeOthers,
  })),
}))
jest.mock("../../workflows/utils/order-edit-hold", () => ({
  ...jest.requireActual("../../workflows/utils/order-edit-hold"),
  orderEditHoldDecision: jest.fn(),
}))
// the order's payment lock (card f3b62beb): the double says whether a call ran inside it
const lockState = { held: false, taken: [] as string[] }
jest.mock("../../workflows/utils/order-payment/lock", () => ({
  orderPaymentLock: () => async (id: string, job: () => Promise<unknown>) => {
    lockState.taken.push(id)
    lockState.held = true
    try {
      return await job()
    } finally {
      lockState.held = false
    }
  },
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
  // Medusa's own route: never reached now (every confirm runs here, under the lock)
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
 * What must fail: a refused edit reaching Medusa's confirm; any confirm that
 * also goes on to Medusa's route (it would confirm twice; for a kept hold the
 * second time cancels it), or runs outside the order's payment lock; a kept hold answered in another shape than Medusa's
 * route; the guard not on the admin confirm route.
 */
describe("the admin order edit confirm", () => {
  beforeEach(() => {
    lockState.taken = []
    decide.mockReset()
    run.mockReset()
    ops.hold.mockClear()
    ops.release.mockClear()
    ops.closeOthers.mockClear()
  })

  it("a refused edit stops with 400, nothing else runs", async () => {
    decide.mockResolvedValueOnce({ action: "refuse", message: "többe kerül" })
    const { res, next } = await call()
    expect(res.statusCode).toBe(400)
    expect(res.sent).toEqual({ type: "not_allowed", message: "többe kerül" })
    expect(next).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  // card f3b62beb: the decision, the confirm and the closing run under the order's payment lock
  it("decides, confirms and closes under the order's payment lock", async () => {
    const inside: string[] = []
    decide.mockImplementationOnce(async () => {
      inside.push(`decide ${lockState.held}`)
      return { action: "keep_hold", collectionId: "col_1", newTotal: 100 }
    })
    run.mockImplementationOnce(async () => {
      inside.push(`confirm ${lockState.held}`)
      return { result: { id: "order_1" } }
    })
    ops.closeOthers.mockImplementationOnce(async () => void inside.push(`close ${lockState.held}`))
    await call()
    expect(lockState.taken).toEqual(["order_1"])
    expect(inside).toEqual(["decide true", "confirm true", "close true"])
  })

  // barracuda on commerce #910: a transfer order's confirm moves its collection too, so it must not race the transfer receipt
  it("nothing to keep: Medusa's confirm workflow runs HERE, under the lock, and answers as Medusa's route; no hold, no closing", async () => {
    decide.mockResolvedValueOnce({ action: "pass", reason: "no_card_hold" })
    const inside: boolean[] = []
    run.mockImplementationOnce(async () => {
      inside.push(lockState.held)
      return { result: { id: "order_1", total: 18000 } }
    })
    const { res, next } = await call()
    expect(run).toHaveBeenCalledWith({ input: { order_id: "order_1", confirmed_by: "user_1" } })
    expect(inside).toEqual([true])
    expect(lockState.taken).toEqual(["order_1"])
    expect(res.sent).toEqual({ order_preview: { id: "order_1", total: 18000 } })
    expect(next).not.toHaveBeenCalled()
    expect(ops.hold).not.toHaveBeenCalled()
    expect(ops.closeOthers).not.toHaveBeenCalled()
  })

  it("an uncaptured hold: Medusa's confirm runs HERE, between hold and release, and answers as Medusa does", async () => {
    decide.mockResolvedValueOnce({ action: "keep_hold", collectionId: "pay_col_1", newTotal: 24300 })
    run.mockImplementationOnce(async () => {
      expect(ops.hold).toHaveBeenCalledWith("pay_col_1")
      expect(ops.release).not.toHaveBeenCalled()
      expect(ops.closeOthers).not.toHaveBeenCalled()
      return { result: { id: "order_1", total: 24300 } }
    })
    const { res, next } = await call()
    expect(run).toHaveBeenCalledWith({ input: { order_id: "order_1", confirmed_by: "user_1" } })
    expect(ops.release).toHaveBeenCalledWith("pay_col_1")
    // a difference link sent before the edit is closed, after the confirm (plan section 5)
    expect(ops.closeOthers).toHaveBeenCalledWith("order_1", "pay_col_1")
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
