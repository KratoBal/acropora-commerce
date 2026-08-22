import {
  computeShippingClass,
  ShippingRelevantItem,
} from "../compute-shipping-class"

/**
 * Every input is an explicit product flag. There is no weight threshold:
 * Acropora keeps no reliable shipping weights, so heavy goods are marked by
 * hand, exactly as in the UNAS webshop this replaces.
 */
const item = (
  id: string,
  overrides: Partial<ShippingRelevantItem> = {}
): ShippingRelevantItem => ({
  line_item_id: id,
  pickup_only: false,
  is_frozen: false,
  is_livestock: false,
  is_heavy: false,
  foxpost_forbidden: false,
  requires_shipping: true,
  ...overrides,
})

describe("computeShippingClass", () => {
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

    it("returns NORMAL for a single unflagged item", () => {
      expect(computeShippingClass([item("a")]).shipping_class).toBe("NORMAL")
    })

    it("returns NORMAL for a multi-item cart of unflagged items", () => {
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
    it("returns HEAVY for an item marked is_heavy", () => {
      const result = computeShippingClass([item("a", { is_heavy: true })])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("a")
    })

    it("makes the whole cart heavy when only one of several items is marked", () => {
      const result = computeShippingClass([
        item("a"),
        item("b", { is_heavy: true }),
        item("c"),
      ])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers HEAVY over NO_FOXPOST across two items", () => {
      const result = computeShippingClass([
        item("a", { foxpost_forbidden: true }),
        item("b", { is_heavy: true }),
      ])
      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers HEAVY over NO_FOXPOST on the same item", () => {
      expect(
        computeShippingClass([
          item("a", { is_heavy: true, foxpost_forbidden: true }),
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
        item("a", { is_heavy: true }),
        item("b", { is_livestock: true }),
      ])
      expect(result.shipping_class).toBe("PICKUP_ONLY")
      expect(result.shipping_class_source).toBe("b")
    })

    it("prefers PICKUP_ONLY over HEAVY and NO_FOXPOST together", () => {
      expect(
        computeShippingClass([
          item("a", { foxpost_forbidden: true }),
          item("b", { is_heavy: true }),
          item("c", { pickup_only: true }),
        ]).shipping_class
      ).toBe("PICKUP_ONLY")
    })

    it("wins even when set on the same item as every other flag", () => {
      expect(
        computeShippingClass([
          item("a", {
            pickup_only: true,
            is_heavy: true,
            foxpost_forbidden: true,
          }),
        ]).shipping_class
      ).toBe("PICKUP_ONLY")
    })

    it("applies to the whole cart even with many unflagged items", () => {
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

  describe("precedence, exhaustively", () => {
    const cases: [string, Partial<ShippingRelevantItem>, string][] = [
      ["pickup_only alone", { pickup_only: true }, "PICKUP_ONLY"],
      ["is_frozen alone", { is_frozen: true }, "PICKUP_ONLY"],
      ["is_livestock alone", { is_livestock: true }, "PICKUP_ONLY"],
      ["is_heavy alone", { is_heavy: true }, "HEAVY"],
      ["foxpost_forbidden alone", { foxpost_forbidden: true }, "NO_FOXPOST"],
      ["nothing set", {}, "NORMAL"],
    ]

    it.each(cases)("%s => %s", (_name, flags, expected) => {
      expect(computeShippingClass([item("a", flags)]).shipping_class).toBe(
        expected
      )
    })

    it("keeps pickup_only > is_heavy > foxpost_forbidden > normal", () => {
      const order = [
        { pickup_only: true },
        { is_heavy: true },
        { foxpost_forbidden: true },
        {},
      ]
      const expected = ["PICKUP_ONLY", "HEAVY", "NO_FOXPOST", "NORMAL"]

      // Adding a strictly weaker flag to the cart must never change the result.
      for (let i = 0; i < order.length; i++) {
        const cart = order.slice(i).map((flags, index) => item(`i${index}`, flags))
        expect(computeShippingClass(cart).shipping_class).toBe(expected[i])
      }
    })
  })

  describe("missing and unusual data", () => {
    it("treats an item with no flags at all as normal, not as restricted", () => {
      expect(computeShippingClass([{}]).shipping_class).toBe("NORMAL")
    })

    it("ignores items that do not require shipping", () => {
      const result = computeShippingClass([
        item("a"),
        item("gift-card", {
          requires_shipping: false,
          is_frozen: true,
          is_heavy: true,
          foxpost_forbidden: true,
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
      [item("a", { is_heavy: true })],
      [item("a", { is_livestock: true })],
      [item("a", { pickup_only: true }), item("b", { is_heavy: true })],
    ]

    for (const cart of carts) {
      const { shipping_class } = computeShippingClass(cart)
      expect(["PICKUP_ONLY", "HEAVY", "NO_FOXPOST", "NORMAL"]).toContain(
        shipping_class
      )
    }
  })
})
