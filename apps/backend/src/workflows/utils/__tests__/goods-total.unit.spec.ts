import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  calculateGoodsTotal,
} from "../goods-total"

const goods = (unitPrice: number, quantity = 1) => ({
  unit_price: unitPrice,
  quantity,
})

const fee = (unitPrice: number) => ({
  unit_price: unitPrice,
  quantity: 1,
  metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
})

describe("goods total", () => {
  it("is zero for an empty cart or fee-only input", () => {
    expect(calculateGoodsTotal([])).toBe(0)
    expect(calculateGoodsTotal([fee(450)])).toBe(0)
  })

  it("multiplies merchandise unit price by quantity", () => {
    expect(calculateGoodsTotal([goods(10_000, 3), goods(2_500, 2)])).toBe(
      35_000
    )
  })

  it("excludes an explicitly marked COD fee from 49,600 HUF of goods", () => {
    expect(calculateGoodsTotal([goods(49_600), fee(450)])).toBe(49_600)
  })

  it("does not mistake a custom item without a variant for a fee", () => {
    expect(
      calculateGoodsTotal([
        {
          unit_price: 1_000,
          quantity: 2,
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "goods" },
        },
      ])
    ).toBe(2_000)
  })
})
