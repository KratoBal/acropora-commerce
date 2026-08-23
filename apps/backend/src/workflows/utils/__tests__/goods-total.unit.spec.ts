import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  calculateGoodsTotal,
} from "../goods-total"

const goods = (unitPrice: number, quantity = 1) => ({
  unit_price: unitPrice,
  quantity,
  is_tax_inclusive: true,
})

// Deliberately without a tax flag: a fee is dropped before the tax check, so
// its tax status must not be able to fail the goods total either way.
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
          is_tax_inclusive: true,
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "goods" },
        },
      ])
    ).toBe(2_000)
  })

  describe("tax-inclusive invariant", () => {
    it("sums tax-inclusive merchandise", () => {
      expect(
        calculateGoodsTotal([
          { unit_price: 10_000, quantity: 2, is_tax_inclusive: true },
        ])
      ).toBe(20_000)
    })

    it("refuses a net price instead of counting it silently", () => {
      expect(() =>
        calculateGoodsTotal([
          { unit_price: 10_000, quantity: 1, is_tax_inclusive: false },
        ])
      ).toThrow(/priced without tax/)
    })

    it("refuses a line whose tax status is unknown", () => {
      expect(() =>
        calculateGoodsTotal([{ unit_price: 10_000, quantity: 1 }])
      ).toThrow(/no known tax status/)
      expect(() =>
        calculateGoodsTotal([
          { unit_price: 10_000, quantity: 1, is_tax_inclusive: null },
        ])
      ).toThrow(/no known tax status/)
    })

    it("separates unknown from net, because the two need different fixes", () => {
      let unknown = ""
      let net = ""
      try {
        calculateGoodsTotal([{ unit_price: 1, quantity: 1 }])
      } catch (e) {
        unknown = (e as Error).message
      }
      try {
        calculateGoodsTotal([
          { unit_price: 1, quantity: 1, is_tax_inclusive: false },
        ])
      } catch (e) {
        net = (e as Error).message
      }
      expect(unknown).not.toBe(net)
    })

    it("names the offending line, so a long cart is diagnosable", () => {
      expect(() =>
        calculateGoodsTotal([
          { unit_price: 1_000, quantity: 1, is_tax_inclusive: true },
          { unit_price: 2_000, quantity: 1, is_tax_inclusive: false },
        ])
      ).toThrow(/line 1/)
    })

    it("never converts, and never falls back to a default", () => {
      // A net 10 000 must not quietly become a gross number of any kind.
      expect(() =>
        calculateGoodsTotal([
          { unit_price: 10_000, quantity: 1, is_tax_inclusive: false },
        ])
      ).toThrow()
    })

    it("ignores the tax status of a fee line", () => {
      expect(
        calculateGoodsTotal([
          { unit_price: 49_600, quantity: 1, is_tax_inclusive: true },
          {
            unit_price: 450,
            quantity: 1,
            is_tax_inclusive: false,
            metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
          },
        ])
      ).toBe(49_600)
    })
  })
})
