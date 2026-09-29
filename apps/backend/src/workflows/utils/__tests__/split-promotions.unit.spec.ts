import { pickupPromoCodes } from "../split-completion"
import { CART_FIELDS, toSplitCart } from "../split-completion-operations"

const promo = (code: string, type: string, allocation: string) => ({
  code,
  application_method: { type, allocation, target_type: "order" },
})

/**
 * THE PICKUP CART'S PROMOTION CODES (P4-3c). Measured on stage, 2026-09-29: a
 * fixed cart-level code applied to both parts of a split is taken twice (635
 * + 635 Ft instead of 635 once). What must fail: a fixed "across" code copied
 * to the pickup cart; a percentage or per-item code left off it; the cart
 * loaded without the fields that tell them apart.
 */
describe("which promotion codes go on the pickup cart", () => {
  it("percentage and fixed per-item codes do; a fixed cart-level code does not", () => {
    expect(
      pickupPromoCodes([
        { code: "SZAZALEK", type: "percentage", allocation: "across" },
        { code: "FIX-500", type: "fixed", allocation: "across" },
        { code: "DARABONKENT", type: "fixed", allocation: "each" },
        { code: null, type: "percentage", allocation: "across" },
      ])
    ).toEqual(["SZAZALEK", "DARABONKENT"])
  })

  it("the loaded cart carries only the dividing codes, read from the promotion's application method", () => {
    const cart = toSplitCart({
      id: "cart_1",
      items: [],
      promotions: [promo("ACROBOT-FIX-500", "fixed", "across"), promo("ACROBOT-TESZT-10", "percentage", "across")],
    })
    expect(cart.pickup_promo_codes).toEqual(["ACROBOT-TESZT-10"])
    expect(CART_FIELDS).toEqual(
      expect.arrayContaining(["promotions.application_method.type", "promotions.application_method.allocation"])
    )
  })
})
