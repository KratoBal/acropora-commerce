jest.mock("../../workflows/utils/order-cancel-guard", () => ({
  prepareOrderCancel: jest.fn(),
}))
jest.mock("../../workflows/utils/order-cancel-guard-operations", () => ({
  orderCancelOperations: jest.fn(() => ({})),
}))

import { prepareOrderCancel } from "../../workflows/utils/order-cancel-guard"
import middlewares from "../middlewares"
import { refundBeforeOrderCancel } from "../refund-before-order-cancel"

const decide = prepareOrderCancel as jest.Mock

const call = async () => {
  const res = {
    statusCode: 0,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(b: unknown) {
      this.sent = b
    },
  }
  const next = jest.fn()
  await refundBeforeOrderCancel(
    { params: { id: "order_1" }, scope: {}, auth_context: { actor_id: "user_1" } } as never,
    res as never,
    next
  )
  return { res, next }
}

/**
 * MI PIROSÍT: ha egy elutasított vagy hibás előkészítés után a Medusa törlése
 * mégis lefutna; ha egy rendben lévő nem futna le; ha az őr nincs a törlés útján.
 */
describe("the admin order cancel", () => {
  it("a refusal stops with 400, the cancel does not run", async () => {
    decide.mockResolvedValueOnce({ action: "refuse", message: "A rendelés nincs törölve: x" })
    const { res, next } = await call()
    expect([res.statusCode, next.mock.calls.length]).toEqual([400, 0])
  })

  it("a failure stops with 400 too", async () => {
    decide.mockRejectedValueOnce(new Error("query down"))
    const { res, next } = await call()
    expect([res.statusCode, next.mock.calls.length]).toEqual([400, 0])
  })

  it("a prepared cancel runs", async () => {
    decide.mockResolvedValueOnce({ action: "pass", refunded: [] })
    const { res, next } = await call()
    expect([res.statusCode, next.mock.calls.length]).toEqual([0, 1])
  })

  it("guards the admin cancel route", () => {
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/admin/orders/:id/cancel" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(refundBeforeOrderCancel)
  })
})
