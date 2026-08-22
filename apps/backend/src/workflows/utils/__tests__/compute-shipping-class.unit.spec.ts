import {
  HEAVY_WEIGHT_THRESHOLD_GRAMS,
  computeShippingClass,
  ShippingRelevantItem,
} from "../compute-shipping-class"

/**
 * All weights in these tests are in GRAMS.
 * The threshold is 20,000 g; exactly 20,000 g is not heavy, 20,001 g is.
 */
const item = (
  id: string,
  overrides: Partial<ShippingRelevantItem> = {}
): ShippingRelevantItem => ({
  line_item_id: id,
  pickup_only: false,
  is_frozen: false,
  is_livestock: false,
  foxpost_forbidden: false,
  weight: 1_000,
  requires_shipping: true,
  ...overrides,
})

describe("computeShippingClass", () => {
  it("uses grams and a 20,000 g threshold", () => {
    expect(HEAVY_WEIGHT_THRESHOLD_GRAMS).toBe(20_000)
  })

  describe("NORMAL", () => {
    it("returns NORMAL for an empty cart", () => {
      expect(computeShippingClass([])).toEqual({
        shipping_class: "NORMAL",
        shipping_class_source: null,
      })
    })

    it("returns NORMAL for null and undefined", () => {
      expect(computeShippingClass(null).shipping_class).toBe("NORMAL")
      expect(computeShippingClass(undefined).shipping_class).toBe("NORMAL")
    })

    it("returns NORMAL for a single normal item", () => {
      expect(computeShippingClass([item("a")]).shipping_class).toBe("NORMAL")
    })

    it("returns NORMAL for a multi-item cart of normal items", () => {
      const result = computeShippingClass([item("a"), item("b"), item("c")])
      expect(result.shipping_class).toBe("NORMAL")
      expect(result.shipping_class_source).toBeNull()
    })
  })

  describe("NO_FOXPOST", () => {
    it("returns NO_FOXPOST for one foxpost-forbidden item", () => {
      const result = computeShippingClass([
        item("a", { foxpost_forbidden: true }),
      ])
      expect(result.shipping_class).toBe("NO_FOXPOST")
      expect(result.shipping_class_source).toBe("a")
    })

    it("returns NO_FOXPOST when only one item of several is forbidden", () => {
      const result = computeShippingClass([
        item("a"),
        item("b", { foxpost_forbidden: true }),
        item("c"),
      ])
      expect(result.shipping_class).toBe("NO_FOXPOST")
      expect(result.shipping_class_source).toBe("b")
    })
  })

  describe("HEAVY", () => {
    it("treats exactly 20,000 g as NOT heavy", () => {
      expect(
        computeShippingClass([item("a", { weight: 20_000 })]).shipping_class
      ).toBe("NORMAL")
    })

    it("treats 20,001 g as heavy", () => {
      const result = computeShippingClass([item("a", { weight: 20_001 })])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("a")
    })

    it("makes the whole cart heavy when only one of several items is heavy", () => {
      const result = computeShippingClass([
        item("a"),
        item("b", { weight: 25_000 }),
        item("c"),
      ])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers HEAVY over NO_FOXPOST", () => {
      const result = computeShippingClass([
        item("a", { foxpost_forbidden: true }),
        item("b", { weight: 30_000 }),
      ])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers HEAVY over NO_FOXPOST on the same item", () => {
      expect(
        computeShippingClass([
          item("a", { weight: 30_000, foxpost_forbidden: true }),
        ]).shipping_class
      ).toBe("HEAVY")
    })
  })

  describe("PICKUP_ONLY", () => {
    it("returns PICKUP_ONLY for frozen goods", () => {
      const result = computeShippingClass([item("a", { is_frozen: true })])
      expect(result.shipping_class).toBe("PICKUP_ONLY")
      expect(result.shipping_class_source).toBe("a")
    })

    it("returns PICKUP_ONLY for livestock", () => {
      expect(
        computeShippingClass([item("a", { is_livestock: true })]).shipping_class
      ).toBe("PICKUP_ONLY")
    })

    it("returns PICKUP_ONLY for an explicitly marked item", () => {
      expect(
        computeShippingClass([item("a", { pickup_only: true })]).shipping_class
      ).toBe("PICKUP_ONLY")
    })

    it("prefers PICKUP_ONLY over HEAVY", () => {
      const result = computeShippingClass([
        item("a", { weight: 30_000 }),
        item("b", { is_livestock: true }),
      ])
      expect(result.shipping_class).toBe("PICKUP_ONLY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers PICKUP_ONLY over HEAVY and NO_FOXPOST together", () => {
      expect(
        computeShippingClass([
          item("a", { foxpost_forbidden: true }),
          item("b", { weight: 30_000 }),
          item("c", { pickup_only: true }),
        ]).shipping_class
      ).toBe("PICKUP_ONLY")
    })

    it("applies to the whole cart even with many normal items", () => {
      expect(
        computeShippingClass([
          item("a"),
          item("b"),
          item("c", { is_frozen: true }),
          item("d"),
        ]).shipping_class
      ).toBe("PICKUP_ONLY")
    })
  })

  describe("missing and unusual data", () => {
    it("does not treat a missing weight as heavy", () => {
      expect(
        computeShippingClass([item("a", { weight: undefined })]).shipping_class
      ).toBe("NORMAL")
      expect(
        computeShippingClass([item("a", { weight: null })]).shipping_class
      ).toBe("NORMAL")
    })

    it("does not treat a non-finite weight as heavy", () => {
      expect(
        computeShippingClass([item("a", { weight: Number.NaN })]).shipping_class
      ).toBe("NORMAL")
    })

    it("treats an item with no flags at all as normal, not as restricted", () => {
      expect(computeShippingClass([{}]).shipping_class).toBe("NORMAL")
    })

    it("ignores items that do not require shipping", () => {
      const result = computeShippingClass([
        item("a"),
        item("gift-card", {
          requires_shipping: false,
          is_frozen: true,
          weight: 50_000,
        }),
      ])
      expect(result.shipping_class).toBe("NORMAL")
      expect(result.shipping_class_source).toBeNull()
    })
  })

  it("returns exactly one class for every cart it is given", () => {
    const carts: ShippingRelevantItem[][] = [
      [],
      [item("a")],
      [item("a", { foxpost_forbidden: true })],
      [item("a", { weight: 20_001 })],
      [item("a", { is_livestock: true })],
      [item("a", { pickup_only: true }), item("b", { weight: 40_000 })],
    ]

    for (const cart of carts) {
      const { shipping_class } = computeShippingClass(cart)
      expect(["PICKUP_ONLY", "HEAVY", "NO_FOXPOST", "NORMAL"]).toContain(
        shipping_class
      )
    }
  })
})
