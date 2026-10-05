jest.mock("../../workflows/utils/capture-before-order-edit", () => ({
  captureBeforeOrderEdit: jest.fn(),
}))
jest.mock("../../workflows/utils/capture-before-order-edit-operations", () => ({
  editCaptureOperations: jest.fn(() => ({})),
}))

import { captureBeforeOrderEdit } from "../../workflows/utils/capture-before-order-edit"
import { captureBeforeOrderEditConfirm } from "../capture-before-order-edit-confirm"
import middlewares from "../middlewares"

const decide = captureBeforeOrderEdit as jest.Mock

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
  await captureBeforeOrderEditConfirm({ params: { id: "order_1" }, scope: {} } as never, res as never, next)
  return { res, next }
}

/**
 * THE ORDER EDIT'S CONFIRM WAITS FOR THE CAPTURE (acrobot 25584). What must
 * fail: a refused edit, or a failed capture, still reaching Medusa's confirm
 * (it would cancel the hold); a captured or untouched one not reaching it;
 * the guard not on the admin confirm route.
 */
describe("the admin order edit confirm", () => {
  it("a refused edit stops with 400, the confirm does not run", async () => {
    decide.mockResolvedValueOnce({ action: "refuse", message: "A kártyás fizetés már le van vonva" })
    const { res, next } = await call()
    expect(res.statusCode).toBe(400)
    expect((res.sent as { message: string }).message).toContain("már le van vonva")
    expect(next).not.toHaveBeenCalled()
  })

  it("a failed capture stops with 400, the confirm does not run", async () => {
    decide.mockRejectedValueOnce(new Error("hold expired"))
    const { res, next } = await call()
    expect(res.statusCode).toBe(400)
    expect((res.sent as { message: string }).message).toContain("hold expired")
    expect(next).not.toHaveBeenCalled()
  })

  it("captured, or nothing to capture: the confirm runs", async () => {
    for (const result of [
      { action: "captured", amount: 17300 },
      { action: "pass", reason: "no_card_hold" },
    ]) {
      decide.mockResolvedValueOnce(result)
      const { res, next } = await call()
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  })

  // MI PIROSÍT: ha a köztes réteg nem adná át a kártyás szolgáltatók listáját
  // (akkor a nem Stripe zárolás-őr soha nem szólna, c64d463f)
  it("hands the online card providers to the decision", async () => {
    process.env.ACROPORA_PP_ONLINE_CARD = "pp_masik_kartya,pp_stripe_stripe"
    decide.mockResolvedValueOnce({ action: "pass", reason: "no_card_hold" })
    await call()
    expect(decide).toHaveBeenLastCalledWith("order_1", expect.anything(), [
      "pp_masik_kartya",
      "pp_stripe_stripe",
    ])
    delete process.env.ACROPORA_PP_ONLINE_CARD
  })

  it("guards the admin confirm route", () => {
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/admin/order-edits/:id/confirm" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(captureBeforeOrderEditConfirm)
  })
})
