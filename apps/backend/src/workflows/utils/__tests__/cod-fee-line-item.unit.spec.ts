import {
  ACROPORA_FEE_TYPE_METADATA_KEY,
  CASH_ON_DELIVERY_FEE_TITLE,
  CASH_ON_DELIVERY_FEE_TYPE,
  assertAtMostOneCashOnDeliveryFee,
  assertCanAddCashOnDeliveryFee,
  buildCashOnDeliveryFeeLineItem,
  buildCashOnDeliveryFeeLineItemFromSettings,
  findCashOnDeliveryFeeLineItems,
  isCashOnDeliveryFeeLineItem,
} from "../cod-fee-line-item"
import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  calculateGoodsTotal,
} from "../goods-total"
import { CASH_ON_DELIVERY_FEE_SETTING_KEY } from "../cod-fee"

const settingsWith = (rows: { key: string; value: unknown }[]) =>
  ({
    listCommerceSettings: async (filters: { key: string }) =>
      rows.filter((r) => r.key === filters.key),
  }) as any

const otherFee = () => ({
  metadata: {
    [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
    [ACROPORA_FEE_TYPE_METADATA_KEY]: "gift_wrapping",
  },
})

describe("cash-on-delivery fee line item", () => {
  describe("creation data", () => {
    const item = buildCashOnDeliveryFeeLineItem(450)

    it("has the customer-facing title", () => {
      expect(item.title).toBe(CASH_ON_DELIVERY_FEE_TITLE)
      expect(item.title).toBe("Utánvét kezelési díj")
    })

    it("carries the amount once, not per item", () => {
      expect(item.unit_price).toBe(450)
      expect(item.quantity).toBe(1)
    })

    it("is a custom price, so nothing re-prices it from a variant", () => {
      expect(item.is_custom_price).toBe(true)
    })

    it("states its tax semantics instead of leaving them to be assumed", () => {
      expect(item.is_tax_inclusive).toBe(true)
    })

    it("does not require shipping, or the order could not be completed", () => {
      // A line with no variant has no shipping profile, and cart completion
      // demands a profile for every line that requires shipping.
      expect(item.requires_shipping).toBe(false)
    })
  })

  describe("marker contract", () => {
    const item = buildCashOnDeliveryFeeLineItem(450)

    it("marks the kind and the fee type", () => {
      expect(item.metadata[ACROPORA_LINE_ITEM_KIND_METADATA_KEY]).toBe("fee")
      expect(item.metadata[ACROPORA_FEE_TYPE_METADATA_KEY]).toBe(
        CASH_ON_DELIVERY_FEE_TYPE
      )
      expect(CASH_ON_DELIVERY_FEE_TYPE).toBe("cash_on_delivery")
    })

    it("recognises its own line", () => {
      expect(isCashOnDeliveryFeeLineItem(item)).toBe(true)
    })

    it("does not claim a fee of another type", () => {
      expect(isCashOnDeliveryFeeLineItem(otherFee())).toBe(false)
    })

    it("does not claim merchandise, however it is priced", () => {
      expect(isCashOnDeliveryFeeLineItem({ metadata: null })).toBe(false)
      expect(isCashOnDeliveryFeeLineItem({})).toBe(false)
      expect(isCashOnDeliveryFeeLineItem(null)).toBe(false)
      expect(
        isCashOnDeliveryFeeLineItem({
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "goods" },
        })
      ).toBe(false)
    })

    it("needs BOTH halves of the marker, not just the kind", () => {
      expect(
        isCashOnDeliveryFeeLineItem({
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
        })
      ).toBe(false)
    })
  })

  describe("duplicate detection", () => {
    const existing = { id: "li_1", ...buildCashOnDeliveryFeeLineItem(450) }

    it("allows the first one", () => {
      expect(() => assertCanAddCashOnDeliveryFee([])).not.toThrow()
      expect(() =>
        assertCanAddCashOnDeliveryFee([{ metadata: null }, otherFee()])
      ).not.toThrow()
    })

    it("blocks a second one", () => {
      expect(() => assertCanAddCashOnDeliveryFee([existing])).toThrow(
        /already present/
      )
    })

    it("is not fooled by a fee of another type", () => {
      expect(() => assertCanAddCashOnDeliveryFee([otherFee()])).not.toThrow()
    })

    it("accepts exactly one as a sane state", () => {
      expect(() => assertAtMostOneCashOnDeliveryFee([existing])).not.toThrow()
      expect(() => assertAtMostOneCashOnDeliveryFee([])).not.toThrow()
    })

    it("rejects two as an insane state", () => {
      expect(() =>
        assertAtMostOneCashOnDeliveryFee([existing, existing])
      ).toThrow(/one cash-on-delivery fee, found 2/)
    })

    it("survives null entries from a query layer", () => {
      expect(findCashOnDeliveryFeeLineItems([null, existing, undefined])).toEqual([
        existing,
      ])
      expect(findCashOnDeliveryFeeLineItems(null)).toEqual([])
    })
  })

  describe("goods total compatibility", () => {
    it("is not merchandise: it does not move the goods total", () => {
      const goods = { unit_price: 49_600, quantity: 1, is_tax_inclusive: true }
      const fee = buildCashOnDeliveryFeeLineItem(450)

      expect(calculateGoodsTotal([goods])).toBe(49_600)
      expect(calculateGoodsTotal([goods, fee])).toBe(49_600)
    })

    it("cannot push a cart over the free-shipping threshold", () => {
      // 49,600 plus a 450 fee is 50,050, which would be free shipping if the
      // fee counted. It must not.
      const goods = { unit_price: 49_600, quantity: 1, is_tax_inclusive: true }
      const total = calculateGoodsTotal([
        goods,
        buildCashOnDeliveryFeeLineItem(450),
      ])

      expect(total).toBeLessThan(50_000)
    })

    it("a fee-only cart has no merchandise value at all", () => {
      expect(calculateGoodsTotal([buildCashOnDeliveryFeeLineItem(450)])).toBe(0)
    })
  })

  describe("the amount", () => {
    it("refuses a waived fee, because a zero line is noise on an invoice", () => {
      expect(() => buildCashOnDeliveryFeeLineItem(0)).toThrow(
        /waived fee means no line at all/
      )
    })

    it("refuses a negative or fractional amount", () => {
      expect(() => buildCashOnDeliveryFeeLineItem(-450)).toThrow()
      expect(() => buildCashOnDeliveryFeeLineItem(450.5)).toThrow()
    })
  })

  describe("runtime editability", () => {
    it("uses the configured amount, not a constant", async () => {
      await expect(
        buildCashOnDeliveryFeeLineItemFromSettings(
          settingsWith([
            { key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "550" },
          ])
        )
      ).resolves.toMatchObject({ unit_price: 550 })
    })

    it("falls back to the documented 450 when nothing is stored", async () => {
      await expect(
        buildCashOnDeliveryFeeLineItemFromSettings(settingsWith([]))
      ).resolves.toMatchObject({ unit_price: 450 })
    })

    it("reads the setting on every call, so a change takes effect at once", async () => {
      const rows = [{ key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "450" }]
      const service = settingsWith(rows)

      await expect(
        buildCashOnDeliveryFeeLineItemFromSettings(service)
      ).resolves.toMatchObject({ unit_price: 450 })

      rows[0].value = "550"

      await expect(
        buildCashOnDeliveryFeeLineItemFromSettings(service)
      ).resolves.toMatchObject({ unit_price: 550 })
    })

    it("fails loudly on a stored but invalid amount", async () => {
      await expect(
        buildCashOnDeliveryFeeLineItemFromSettings(
          settingsWith([{ key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "-1" }])
        )
      ).rejects.toThrow(/must not be negative/)
    })
  })
})
