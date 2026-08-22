import { ShippingPricingSettings } from "../../../modules/commerce-settings/accessor"
import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  calculateGoodsTotal,
} from "../goods-total"
import { calculateShippingPrice } from "../shipping-pricing"

const settings: ShippingPricingSettings = {
  shipping_gls_normal_huf: 1_990,
  shipping_gls_heavy_huf: 5_990,
  shipping_foxpost_huf: 1_490,
  free_shipping_threshold_huf: 50_000,
}

const price = (
  role: Parameters<typeof calculateShippingPrice>[0]["role"],
  goodsTotalHuf: number
) => calculateShippingPrice({ role, goodsTotalHuf, settings })

describe("shipping pricing policy", () => {
  it.each([49_599, 49_600, 49_999])(
    "keeps normal carrier prices below the threshold at %i HUF",
    (goodsTotalHuf) => {
      expect(price("GLS_NORMAL", goodsTotalHuf)).toBe(1_990)
      expect(price("FOXPOST", goodsTotalHuf)).toBe(1_490)
    }
  )

  it.each([50_000, 50_001])(
    "makes normal GLS and Foxpost free at %i HUF",
    (goodsTotalHuf) => {
      expect(price("GLS_NORMAL", goodsTotalHuf)).toBe(0)
      expect(price("FOXPOST", goodsTotalHuf)).toBe(0)
    }
  )

  it("does not let a 450 HUF COD fee push 49,600 HUF of goods over the threshold", () => {
    const goodsTotalHuf = calculateGoodsTotal([
      { unit_price: 49_600, quantity: 1 },
      {
        unit_price: 450,
        quantity: 1,
        metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
      },
    ])

    expect(goodsTotalHuf).toBe(49_600)
    expect(price("GLS_NORMAL", goodsTotalHuf)).toBe(1_990)
  })

  it("keeps pickup free at every goods total", () => {
    expect(price("PICKUP", 0)).toBe(0)
    expect(price("PICKUP", 50_001)).toBe(0)
  })

  it("does not waive heavy GLS at the normal free-shipping threshold", () => {
    expect(price("GLS_HEAVY", 50_000)).toBe(5_990)
    expect(price("GLS_HEAVY", 100_000)).toBe(5_990)
  })

  it("rejects invalid pricing inputs at the pure-domain boundary", () => {
    expect(() => price("GLS_NORMAL", -1)).toThrow(/must not be negative/)
    expect(() =>
      calculateShippingPrice({
        role: "FOXPOST",
        goodsTotalHuf: 1_000,
        settings: { ...settings, shipping_foxpost_huf: 1.5 },
      })
    ).toThrow(/whole number/)
  })
})
