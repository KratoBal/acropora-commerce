import { describe, expect, it } from "vitest"

import { kosarOsszegek } from "./kosar-osszegek"

/**
 * A mert kosár (acrobot, 2026-09-07, teszt bolt): nettó 944,88 + adó 255,12 =
 * bruttó 1200; a szállítás (GLS csomagpont, 2026-09-29): nettó 2755,91 + adó
 * 744,09 = 3500.
 */
const MERT = {
  currency_code: "huf",
  item_subtotal: 944.88,
  item_tax_total: 255.12,
  shipping_subtotal: 2755.91,
  shipping_tax_total: 744.09,
  discount_subtotal: 0,
  tax_total: 999.21,
  total: 4700,
}

describe("a kosár összegei", () => {
  it("a részösszeg és a szállítás BRUTTÓ, a fizetendő a total", () => {
    const o = kosarOsszegek(MERT)
    expect(o.itemGross).toBeCloseTo(1200, 6)
    expect(o.shippingGross).toBeCloseTo(3500, 6)
    expect(o.total).toBe(4700)
    expect(o.currencyCode).toBe("huf")
  })

  it("adó-érték nélkül a nettó marad, és a fizetendő akkor is a total", () => {
    const o = kosarOsszegek({
      ...MERT,
      item_tax_total: undefined,
      shipping_tax_total: undefined,
      tax_total: undefined,
    })
    expect(o.itemGross).toBe(944.88)
    expect(o.shippingGross).toBe(2755.91)
    expect(o.tax).toBe(0)
    expect(o.total).toBe(4700)
  })

  it("a hiányzó mezők nullák, nem NaN", () => {
    const o = kosarOsszegek({ currency_code: "huf" })
    expect(o).toEqual({
      currencyCode: "huf",
      itemGross: 0,
      shippingGross: 0,
      discount: 0,
      tax: 0,
      total: 0,
    })
  })
})
