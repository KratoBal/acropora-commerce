import { BigNumber } from "@medusajs/framework/utils"

import { medusaNumber } from "../medusa-number"

describe("medusaNumber", () => {
  it("reads every form Medusa gives a number in", () => {
    expect(medusaNumber(3, "x")).toBe(3)
    expect(medusaNumber(0, "x")).toBe(0)
    expect(medusaNumber("2", "x")).toBe(2)
    expect(medusaNumber(new BigNumber(10500), "x")).toBe(10500)
    expect(medusaNumber({ value: "10500", precision: 20 }, "x")).toBe(10500)
  })

  it("a missing value throws, it is not a silent 0", () => {
    expect(() => medusaNumber(undefined, "The quantity of item i1")).toThrow("The quantity of item i1 was not loaded")
    expect(() => medusaNumber(null, "The quantity of item i1")).toThrow("The quantity of item i1 was not loaded")
  })

  it("something that is not a number throws instead of becoming NaN", () => {
    expect(() => medusaNumber("abc", "The unit price of item i1")).toThrow("The unit price of item i1 is not a number")
  })
})
