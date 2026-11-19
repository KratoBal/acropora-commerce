import { MedusaError } from "@medusajs/framework/utils"

import {
  assertCartHasNoCouponWithPersonalDiscount,
  assertNoCouponWithPersonalDiscount,
  newCodes,
  PERSONAL_DISCOUNT_COUPON,
  personalCodeOf,
} from "../personal-discount-coupon"

/*
  A SAJÁT KEDVEZMÉNY MELLETT NINCS KUPON (20713f62, Balázs 2026-11-19). WHAT TURNS RED: a coupon passes for a customer
  with a live own discount; the customer's own code is refused; a customer whose own discount is off, or a guest, is
  refused a coupon; the refusal does not carry the code the storefront reads; a refresh that keeps the cart's codes
  counts as a new code; the completion lets a coupon through that came before the login.
*/
const ownPromotion = (status: string, isAutomatic = true) => ({
  id: "promo_own",
  code: personalCodeOf("cus_01ABC"),
  status,
  is_automatic: isAutomatic,
})

/** The query: the promotion lookup by code, and the cart read of the completion. */
const container = (promotions: Record<string, unknown>[], cart?: Record<string, unknown>) => {
  const graph = jest.fn(async ({ entity, filters }: { entity: string; filters: { code?: string } }) => {
    if (entity === "cart") return { data: cart ? [cart] : [] }
    return { data: promotions.filter((row) => row.code === filters.code) }
  })
  return { graph, container: { resolve: () => ({ graph }) } }
}

describe("assertNoCouponWithPersonalDiscount", () => {
  it("refuses a coupon for a customer with a live own discount, with the storefront's code", async () => {
    const { container: c } = container([ownPromotion("active")])
    const refusal = assertNoCouponWithPersonalDiscount(c, "cus_01ABC", ["EGYEDI-CUS_01ABC", "TAVASZ10"])
    await expect(refusal).rejects.toThrow(MedusaError)
    await expect(
      assertNoCouponWithPersonalDiscount(c, "cus_01ABC", ["TAVASZ10"])
    ).rejects.toThrow(new RegExp(`^${PERSONAL_DISCOUNT_COUPON}:`))
  })

  it("lets the customer's own code through, and asks nothing when there is no coupon", async () => {
    const { graph, container: c } = container([ownPromotion("active")])
    await expect(assertNoCouponWithPersonalDiscount(c, "cus_01ABC", ["EGYEDI-CUS_01ABC"])).resolves.toBeUndefined()
    await expect(assertNoCouponWithPersonalDiscount(c, "cus_01ABC", [])).resolves.toBeUndefined()
    expect(graph).not.toHaveBeenCalled()
  })

  it("lets a coupon through when the own discount is off, missing, or not automatic, and for a guest", async () => {
    for (const rows of [[ownPromotion("inactive")], [], [ownPromotion("active", false)]]) {
      const { container: c } = container(rows)
      await expect(assertNoCouponWithPersonalDiscount(c, "cus_01ABC", ["TAVASZ10"])).resolves.toBeUndefined()
    }
    const { graph, container: c } = container([ownPromotion("active")])
    await expect(assertNoCouponWithPersonalDiscount(c, null, ["TAVASZ10"])).resolves.toBeUndefined()
    expect(graph).not.toHaveBeenCalled()
  })

  it("another customer's own discount does not count", async () => {
    const { container: c } = container([ownPromotion("active")])
    await expect(assertNoCouponWithPersonalDiscount(c, "cus_02XYZ", ["TAVASZ10"])).resolves.toBeUndefined()
  })
})

describe("newCodes", () => {
  it("a refresh that keeps the cart's codes adds none; a typed code is new", () => {
    expect(newCodes(["EGYEDI-CUS_01ABC", "TAVASZ10"], ["EGYEDI-CUS_01ABC", "TAVASZ10"])).toEqual([])
    expect(newCodes(["EGYEDI-CUS_01ABC", "TAVASZ10"], ["EGYEDI-CUS_01ABC"])).toEqual(["TAVASZ10"])
    expect(newCodes(undefined, ["TAVASZ10"])).toEqual([])
  })
})

describe("assertCartHasNoCouponWithPersonalDiscount", () => {
  it("stops a completion whose coupon came before the login", async () => {
    const { container: c } = container([ownPromotion("active")], {
      id: "cart_1",
      customer_id: "cus_01ABC",
      promotions: [{ code: "EGYEDI-CUS_01ABC" }, { code: "TAVASZ10" }],
    })
    await expect(assertCartHasNoCouponWithPersonalDiscount(c, "cart_1")).rejects.toThrow(PERSONAL_DISCOUNT_COUPON)
  })

  it("lets a completion through with only the own discount", async () => {
    const { container: c } = container([ownPromotion("active")], {
      id: "cart_1",
      customer_id: "cus_01ABC",
      promotions: [{ code: "EGYEDI-CUS_01ABC" }],
    })
    await expect(assertCartHasNoCouponWithPersonalDiscount(c, "cart_1")).resolves.toBeUndefined()
  })
})
