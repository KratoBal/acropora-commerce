import { AdminTransitionOrderBusinessStatus } from "../validators"

describe("the admin status-transition body", () => {
  it("accepts the seventh status, Visszaigazolva", () => {
    expect(
      AdminTransitionOrderBusinessStatus.parse({ status: "confirmed" }),
    ).toEqual({ status: "confirmed" })
  })

  it("still rejects an unknown status", () => {
    expect(() =>
      AdminTransitionOrderBusinessStatus.parse({ status: "on_hold" }),
    ).toThrow()
  })
})
