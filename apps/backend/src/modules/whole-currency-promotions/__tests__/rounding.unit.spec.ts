import { BigNumber } from "@medusajs/framework/utils"

import { medusaPromotionService } from "../loaders/install"
import { installWholeCurrencyRounding, roundAdjustmentActions, roundToCurrency } from "../rounding"

/*
  A DISCOUNT IN WHOLE CURRENCY UNITS (acrobot 56524, 56528: a 15% coupon on 29 990 Ft gave 4 498,5 Ft on the test shop).
  WHAT TURNS RED: a forint adjustment keeps its fraction; a currency with decimals loses them; a removal or a skipped code
  is touched; the wrap does not reach the computed result, or a second install wraps it again; the class Medusa loads
  is not found where the loader looks, or has no computeActions to wrap any more.
*/
describe("roundToCurrency", () => {
  it("forint to whole units, half up", () => {
    expect(roundToCurrency(4498.5, "huf")).toBe(4499)
    expect(roundToCurrency(2699.1, "HUF")).toBe(2699)
    expect(roundToCurrency(2999, "huf")).toBe(2999)
  })
  it("a BigNumber amount as Medusa passes it", () => {
    expect(roundToCurrency(new BigNumber(4498.5), "huf")).toBe(4499)
  })
  it("a currency with cents keeps two digits, an unknown one stays as it is", () => {
    expect(roundToCurrency(10.005, "eur")).toBe(10.01)
    expect(roundToCurrency(10.12345, "xyz")).toBe(10.12345)
    expect(roundToCurrency(10.5, undefined)).toBe(10.5)
  })
})

describe("roundAdjustmentActions", () => {
  it("rounds the item and shipping adjustments, leaves every other action", () => {
    const actions = [
      { action: "addItemAdjustment", item_id: "i1", amount: 4498.5, code: "K" },
      { action: "addShippingMethodAdjustment", shipping_method_id: "s1", amount: 172.5, code: "K" },
      { action: "removeItemAdjustment", adjustment_id: "a1", item_id: "i1", code: "K" },
      { action: "campaignBudgetExceeded", code: "K" },
    ]
    expect(roundAdjustmentActions(actions, "huf")).toEqual([
      { action: "addItemAdjustment", item_id: "i1", amount: 4499, code: "K" },
      { action: "addShippingMethodAdjustment", shipping_method_id: "s1", amount: 173, code: "K" },
      { action: "removeItemAdjustment", adjustment_id: "a1", item_id: "i1", code: "K" },
      { action: "campaignBudgetExceeded", code: "K" },
    ])
  })

  it("a code's lines add up to its rounded whole: a 1 000 Ft coupon over three lines is 1 000, not 999", () => {
    const third = 1000 / 3
    const rounded = roundAdjustmentActions(
      [
        { action: "addItemAdjustment", item_id: "i1", amount: third, code: "FIX1000" },
        { action: "addItemAdjustment", item_id: "i2", amount: third, code: "FIX1000" },
        { action: "addItemAdjustment", item_id: "i3", amount: third, code: "FIX1000" },
      ],
      "huf"
    )
    expect(rounded.map((a) => a.amount)).toEqual([334, 333, 333])
    expect(rounded.reduce((sum, a) => sum + a.amount, 0)).toBe(1000)
  })

  it("the largest fractions take the units left over, and each code is rounded on its own", () => {
    const rounded = roundAdjustmentActions(
      [
        // 15% of 2 999, 3 333 and 1 001: 449.85 + 499.95 + 150.15 = 1 099.95 -> 1 100
        { action: "addItemAdjustment", item_id: "i1", amount: 449.85, code: "P15" },
        { action: "addItemAdjustment", item_id: "i2", amount: 499.95, code: "P15" },
        { action: "addItemAdjustment", item_id: "i3", amount: 150.15, code: "P15" },
        // another code on the same lines: its own whole (2 x 0.5 = 1), not mixed with P15
        { action: "addItemAdjustment", item_id: "i1", amount: 0.5, code: "EGYEDI" },
        { action: "addItemAdjustment", item_id: "i2", amount: 0.5, code: "EGYEDI" },
      ],
      "huf"
    )
    expect(rounded.map((a) => [a.code, a.amount])).toEqual([
      ["P15", 450],
      ["P15", 500],
      ["P15", 150],
      ["EGYEDI", 1],
      ["EGYEDI", 0],
    ])
  })
})

describe("installWholeCurrencyRounding", () => {
  it("the wrapped computeActions returns the module's own result, rounded to the context's currency, once", async () => {
    const seen: unknown[][] = []
    class FakePromotionService {
      async computeActions(...args: unknown[]) {
        seen.push(args)
        return [{ action: "addItemAdjustment", item_id: "i1", amount: 4498.5, code: "K" }]
      }
    }
    expect(installWholeCurrencyRounding(FakePromotionService)).toBe(true)
    expect(installWholeCurrencyRounding(FakePromotionService)).toBe(false)
    const result = await new FakePromotionService().computeActions(["K"], { currency_code: "huf", items: [] }, {})
    expect(result).toEqual([{ action: "addItemAdjustment", item_id: "i1", amount: 4499, code: "K" }])
    expect(seen).toEqual([[["K"], { currency_code: "huf", items: [] }, {}]])
  })

  it("a context without a currency is said, not rounded silently wrong", async () => {
    class FakePromotionService {
      async computeActions() {
        return [{ action: "addItemAdjustment", item_id: "i1", amount: 4498.5, code: "K" }]
      }
    }
    const missing = jest.fn()
    installWholeCurrencyRounding(FakePromotionService, missing)
    const service = new FakePromotionService()
    expect(await service.computeActions(["K"], { items: [] }, {})).toEqual([
      { action: "addItemAdjustment", item_id: "i1", amount: 4498.5, code: "K" },
    ])
    expect(missing).toHaveBeenCalledTimes(1)
    await service.computeActions(["K"], { currency_code: "huf", items: [] }, {})
    expect(missing).toHaveBeenCalledTimes(1)
  })

  it("the class Medusa loads is found from @medusajs/medusa's place and still has computeActions", () => {
    expect(typeof medusaPromotionService().prototype.computeActions).toBe("function")
  })
})
