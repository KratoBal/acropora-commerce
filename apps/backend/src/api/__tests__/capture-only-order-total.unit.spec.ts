jest.mock("../../workflows/utils/admin-capture-guard", () => ({
  guardAdminCapture: jest.fn(),
}))
jest.mock("../../workflows/utils/admin-capture-guard-operations", () => ({
  adminCaptureOperations: jest.fn(() => ({})),
}))

import { guardAdminCapture } from "../../workflows/utils/admin-capture-guard"
import { captureOnlyOrderTotal } from "../capture-only-order-total"
import middlewares from "../middlewares"

const decide = guardAdminCapture as jest.Mock

const call = async (body: unknown) => {
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
  await captureOnlyOrderTotal({ params: { id: "pay_1" }, body, scope: {} } as never, res as never, next)
  return { res, next }
}

/**
 * THE ADMIN CAPTURE WAITS FOR THE GUARD (acrobot 26265). What must fail: a
 * refused capture reaching Medusa's capture; the requested amount not handed
 * to the decision; a malformed amount slipping past as "left out"; the guard
 * missing from the capture route, or sitting on a route the shared capture or
 * the order edit uses.
 */
describe("the admin payment capture", () => {
  beforeEach(() => decide.mockReset())

  it("a refused capture stops with 400, Medusa's capture does not run", async () => {
    decide.mockResolvedValueOnce({ action: "refuse", message: "Kisebb összeget nem lehet levonni" })
    const { res, next } = await call({ amount: 10000 })
    expect(res.statusCode).toBe(400)
    expect((res.sent as { message: string }).message).toContain("Kisebb összeget")
    expect(next).not.toHaveBeenCalled()
  })

  it("a failed check stops with 400 too", async () => {
    decide.mockRejectedValueOnce(new Error("query down"))
    const { res, next } = await call({ amount: 14000 })
    expect(res.statusCode).toBe(400)
    expect((res.sent as { message: string }).message).toContain("query down")
    expect(next).not.toHaveBeenCalled()
  })

  it("hands the requested amount, or none, to the decision; a pass runs the capture", async () => {
    decide.mockResolvedValue({ action: "pass" })
    for (const [body, expected] of [
      [{ amount: 14000 }, 14000],
      [{ amount: "14000" }, 14000],
      [{}, undefined],
      [undefined, undefined],
    ] as const) {
      const { res, next } = await call(body)
      expect(decide).toHaveBeenLastCalledWith("pay_1", expected, expect.anything())
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  })

  // MI PIROSÍT: ha a nem szám összeg "kihagyottként" csúszna át az őrön
  it("a malformed amount stops before the decision", async () => {
    for (const amount of ["tízezer", "", true, { value: 1 }]) {
      const { res, next } = await call({ amount })
      expect(res.statusCode).toBe(400)
      expect(next).not.toHaveBeenCalled()
    }
    expect(decide).not.toHaveBeenCalled()
  })

  it("guards the admin capture route, and only that one", () => {
    const guarded = (middlewares.routes ?? []).filter((r) =>
      (r.middlewares ?? []).includes(captureOnlyOrderTotal as never)
    )
    expect(guarded.map((r) => [r.matcher, (r as { methods?: string[] }).methods])).toEqual([
      ["/admin/payments/:id/capture", ["POST"]],
    ])
  })
})
