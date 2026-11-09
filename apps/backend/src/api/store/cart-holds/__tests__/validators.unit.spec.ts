import { MAX_VARIANTS, StoreGetCartHoldsParams } from "../validators"

/** What must fail: one `variant_id` not read as a list; an unbounded list; a question with no piece; an unknown key. */
describe("GET /store/cart-holds query", () => {
  it("CHQ-ONE: a single variant_id becomes a list of one, the cart is optional", () => {
    expect(StoreGetCartHoldsParams.parse({ variant_id: "v_1" })).toEqual({ variant_id: ["v_1"] })
    expect(StoreGetCartHoldsParams.parse({ variant_id: ["v_1", "v_2"], cart_id: "cart_1" })).toEqual({
      variant_id: ["v_1", "v_2"],
      cart_id: "cart_1",
    })
  })

  it("CHQ-BOUNDS: no piece, an empty id, more than a cart's worth, or another key is refused", () => {
    const tooMany = Array.from({ length: MAX_VARIANTS + 1 }, (_, i) => `v_${i}`)
    expect(StoreGetCartHoldsParams.safeParse({}).success).toBe(false)
    expect(StoreGetCartHoldsParams.safeParse({ variant_id: "" }).success).toBe(false)
    expect(StoreGetCartHoldsParams.safeParse({ variant_id: tooMany }).success).toBe(false)
    expect(StoreGetCartHoldsParams.safeParse({ variant_id: tooMany.slice(1) }).success).toBe(true)
    expect(StoreGetCartHoldsParams.safeParse({ variant_id: "v_1", fields: "*" }).success).toBe(false)
  })
})
