import {
  LOYALTY_CREDIT_REFERENCE,
  LOYALTY_DEFAULTS,
  loyaltyCreditPlan,
  loyaltyCredits,
  loyaltySettings,
  maxPoints,
  pointsOfCredit,
  type LoyaltySettings,
} from "../loyalty-credit"

/**
 * THE POINTS CREDIT'S RULES (card dfb79916), pure. What must fail: a setting that is malformed becoming a guess instead
 * of the default; the redemption on without the switch; a cart under the order minimum taking points; a share under the
 * minimum points taking points; the share exceeding the allowed percent; a cap that rounds UP to a fractional point; a
 * credit kept after the cart no longer qualifies; the gift card's credit not counting against the points' room.
 */
const S: LoyaltySettings = { ...LOYALTY_DEFAULTS, enabled: true }
const line = (points: number, amount = points, id = "cl_1") => ({
  id,
  amount,
  reference: LOYALTY_CREDIT_REFERENCE,
  reference_id: "cus_1",
  metadata: { points, cart_id: "cart_1" },
})

describe("loyaltySettings", () => {
  it("the defaults are today's UNAS rules, and the redemption is OFF until it is switched on", () => {
    expect(loyaltySettings({})).toEqual({ enabled: false, value: 1, minOrder: 30000, minPoints: 100, maxPercent: 100 })
  })

  it("only the exact word true switches it on", () => {
    for (const v of ["true", " TRUE "]) expect(loyaltySettings({ LOYALTY_REDEMPTION_ENABLED: v }).enabled).toBe(true)
    for (const v of ["1", "yes", "on", "false", ""]) expect(loyaltySettings({ LOYALTY_REDEMPTION_ENABLED: v }).enabled).toBe(false)
  })

  it("the numbers come from the environment", () => {
    expect(
      loyaltySettings({
        LOYALTY_POINT_VALUE_HUF: "2",
        LOYALTY_MIN_ORDER_HUF: "10000",
        LOYALTY_MIN_POINTS: "50",
        LOYALTY_MAX_PERCENT: "40",
      })
    ).toMatchObject({ value: 2, minOrder: 10000, minPoints: 50, maxPercent: 40 })
  })

  it("a malformed, zero, negative or fractional number is the default, never a guess", () => {
    for (const v of ["abc", "0", "-5", "1.5", "1e3", "", "  ", "99999999999999999999"])
      expect(loyaltySettings({ LOYALTY_POINT_VALUE_HUF: v }).value).toBe(1)
    // a percent above 100 is not a percent
    expect(loyaltySettings({ LOYALTY_MAX_PERCENT: "250" }).maxPercent).toBe(100)
  })
})

describe("maxPoints", () => {
  it("the whole total when the balance covers it, shipping and fees in", () => {
    expect(maxPoints({ beforeCredits: 45_000, balance: 100_000, settings: S })).toBe(45_000)
  })

  it("the balance when it is smaller", () => {
    expect(maxPoints({ beforeCredits: 45_000, balance: 2_500, settings: S })).toBe(2_500)
  })

  it("nothing under the order minimum (30 000 Ft is in, 29 999 is out)", () => {
    expect(maxPoints({ beforeCredits: 30_000, balance: 5_000, settings: S })).toBe(5_000)
    expect(maxPoints({ beforeCredits: 29_999, balance: 5_000, settings: S })).toBe(0)
  })

  it("nothing when the points would be under the minimum (100)", () => {
    expect(maxPoints({ beforeCredits: 50_000, balance: 99, settings: S })).toBe(0)
    expect(maxPoints({ beforeCredits: 50_000, balance: 100, settings: S })).toBe(100)
  })

  it("the allowed share of the total, rounded down to a whole point", () => {
    const half = { ...S, maxPercent: 50 }
    expect(maxPoints({ beforeCredits: 40_001, balance: 99_999, settings: half })).toBe(20_000)
  })

  it("a point worth more than a forint is a whole point count: a part of a point is not paid", () => {
    expect(maxPoints({ beforeCredits: 40_001, balance: 99_999, settings: { ...S, value: 2 } })).toBe(20_000)
  })
})

describe("loyaltyCredits and pointsOfCredit", () => {
  it("picks only the points credit lines", () => {
    const other = { id: "x", amount: 5, reference: "gift_card", reference_id: "g", metadata: {} }
    expect(loyaltyCredits([line(100), other, null, undefined]).map((l) => l.id)).toEqual(["cl_1"])
    expect(loyaltyCredits(null)).toEqual([])
  })

  it("the points are a positive whole number in the metadata, else zero", () => {
    expect(pointsOfCredit(line(250))).toBe(250)
    expect(pointsOfCredit({ id: "a", metadata: { points: 1.5 } })).toBe(0)
    expect(pointsOfCredit({ id: "a", metadata: { points: -3 } })).toBe(0)
    expect(pointsOfCredit({ id: "a", metadata: null })).toBe(0)
  })
})

describe("loyaltyCreditPlan", () => {
  const plan = (over: Partial<Parameters<typeof loyaltyCreditPlan>[0]>) =>
    loyaltyCreditPlan({ totalWithCredits: 20_000, creditLineTotal: 10_000, credits: [line(10_000, 10_000)], settings: S, ...over })

  it("keeps a credit that still fits", () => {
    expect(plan({})).toEqual({ action: "keep" })
  })

  it("no credit, nothing to do", () => {
    expect(plan({ credits: [] })).toEqual({ action: "keep" })
  })

  it("caps to the whole points the cart now takes", () => {
    // a 20 percent share of the 30 000 the cart pays is 6 000 points: the 8 000 carried come down to it
    const r = plan({ totalWithCredits: 22_000, creditLineTotal: 8_000, credits: [line(8_000, 8_000)], settings: { ...S, maxPercent: 20 } })
    expect(r).toMatchObject({ action: "cap", points: 6_000, removeIds: ["cl_1"] })
    const smaller = plan({ totalWithCredits: 31_000, creditLineTotal: 0, credits: [line(9_000, 9_000)] })
    expect(smaller).toEqual({ action: "keep" })
  })

  it("a cart that got cheaper lowers the credit to what it takes, never raises it", () => {
    const r = plan({ totalWithCredits: 0, creditLineTotal: 31_000, credits: [line(40_000, 40_000)] })
    expect(r).toMatchObject({ action: "cap", points: 31_000 })
    const dearer = plan({ totalWithCredits: 90_000, creditLineTotal: 10_000, credits: [line(10_000, 10_000)] })
    expect(dearer).toEqual({ action: "keep" })
  })

  it("removes the credit when the cart fell under the order minimum", () => {
    const r = plan({ totalWithCredits: 4_000, creditLineTotal: 10_000, credits: [line(10_000, 10_000)] })
    expect(r).toEqual({ action: "remove", removeIds: ["cl_1"] })
  })

  it("removes it when the allowed share fell under the minimum points", () => {
    const r = plan({ totalWithCredits: 30_000, creditLineTotal: 0, credits: [line(500, 500)], settings: { ...S, maxPercent: 1, minPoints: 400 } })
    expect(r).toEqual({ action: "remove", removeIds: ["cl_1"] })
  })

  it("a gift card's credit takes its share first: the room is what is left after it", () => {
    const r = plan({ totalWithCredits: 0, creditLineTotal: 40_000, otherCredits: 35_000, credits: [line(5_000, 5_000)] })
    expect(r).toEqual({ action: "remove", removeIds: ["cl_1"] })
  })

  it("two points credit lines on one cart are collapsed to one", () => {
    const r = plan({ credits: [line(5_000, 5_000, "a"), line(5_000, 5_000, "b")] })
    expect(r).toMatchObject({ action: "cap", removeIds: ["a", "b"] })
  })

  it("a credit with no usable point count is removed", () => {
    const r = plan({ credits: [{ id: "bad", amount: 500, reference: LOYALTY_CREDIT_REFERENCE, metadata: {} }] })
    expect(r).toEqual({ action: "remove", removeIds: ["bad"] })
  })
})
