import { StoreGetPickupShortageParams } from "../validators"

/** What must fail: a question without the cart or the location, an empty id, another key. */
describe("GET /store/pickup-shortage query", () => {
  it("PSQ-BOTH: the cart and the one location are required", () => {
    expect(StoreGetPickupShortageParams.parse({ cart_id: "cart_1", location_id: "sloc_1" })).toEqual({
      cart_id: "cart_1",
      location_id: "sloc_1",
    })
    expect(StoreGetPickupShortageParams.safeParse({ cart_id: "cart_1" }).success).toBe(false)
    expect(StoreGetPickupShortageParams.safeParse({ location_id: "sloc_1" }).success).toBe(false)
  })

  it("PSQ-STRICT: an empty id or another key is refused", () => {
    expect(StoreGetPickupShortageParams.safeParse({ cart_id: "", location_id: "sloc_1" }).success).toBe(false)
    expect(StoreGetPickupShortageParams.safeParse({ cart_id: "c", location_id: "" }).success).toBe(false)
    expect(StoreGetPickupShortageParams.safeParse({ cart_id: "c", location_id: "l", fields: "*" }).success).toBe(false)
  })
})
