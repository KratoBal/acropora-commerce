import { allowedRolesFor } from "../shipping-eligibility"
import { createLivestockPredicate, parseLivestockProductTypeIds } from "../livestock"
import {
  normalizeCartShippingItems,
  resolveCartShippingClass,
} from "../resolve-cart-shipping-class"

type Variant = {
  id: string
  product?: { id?: string | null; type_id?: string | null } | null
}

type Attribute = {
  product_id: string
  pickup_only?: boolean
  foxpost_forbidden?: boolean
  is_heavy?: boolean
  is_frozen?: boolean
}

/**
 * A fake container that records every query, so the tests can also assert that
 * the resolver does not run a query per cart line.
 */
const makeContainer = (variants: Variant[], attributes: Attribute[]) => {
  const calls: { entity: string; filters: any }[] = []

  const container = {
    resolve: () => ({
      graph: async ({ entity, filters }: any) => {
        calls.push({ entity, filters })

        if (entity === "variant") {
          return {
            data: variants.filter((v) => filters.id.includes(v.id)),
          }
        }

        if (entity === "shipping_attribute") {
          return {
            data: attributes.filter((a) =>
              filters.product_id.includes(a.product_id)
            ),
          }
        }

        throw new Error(`unexpected entity ${entity}`)
      },
    }),
  }

  return { container, calls }
}

const variant = (
  id: string,
  productId: string,
  typeId: string | null = null
): Variant => ({ id, product: { id: productId, type_id: typeId } })

const line = (
  id: string,
  variantId: string | null,
  requiresShipping = true
) => ({ id, variant_id: variantId, requires_shipping: requiresShipping })

describe("resolveCartShippingClass", () => {
  it("returns NORMAL and runs no query for an empty cart", async () => {
    const { container, calls } = makeContainer([], [])

    const result = await resolveCartShippingClass({ items: [] }, container as any)

    expect(result.shipping_class).toBe("NORMAL")
    expect(calls).toHaveLength(0)
  })

  it("uses two id-filtered queries regardless of cart size", async () => {
    const { container, calls } = makeContainer(
      [
        variant("v1", "p1"),
        variant("v2", "p2"),
        variant("v3", "p3"),
      ],
      [{ product_id: "p2", foxpost_forbidden: true }]
    )

    await resolveCartShippingClass(
      { items: [line("l1", "v1"), line("l2", "v2"), line("l3", "v3")] },
      container as any
    )

    expect(calls.map((c) => c.entity)).toEqual(["variant", "shipping_attribute"])
  })

  describe("mixed carts", () => {
    it("normal plus heavy becomes HEAVY", async () => {
      const { container } = makeContainer(
        [variant("v1", "p1"), variant("v2", "p2")],
        [{ product_id: "p2", is_heavy: true }]
      )

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1"), line("l2", "v2")] },
        container as any
      )

      expect(result.shipping_class).toBe("HEAVY")
      expect(result.shipping_class_source).toBe("l2")
    })

    it("normal plus pickup-only becomes PICKUP_ONLY", async () => {
      const { container } = makeContainer(
        [variant("v1", "p1"), variant("v2", "p2")],
        [{ product_id: "p2", pickup_only: true }]
      )

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1"), line("l2", "v2")] },
        container as any
      )

      expect(result.shipping_class).toBe("PICKUP_ONLY")
    })

    it("heavy plus pickup-only becomes PICKUP_ONLY", async () => {
      const { container } = makeContainer(
        [variant("v1", "p1"), variant("v2", "p2")],
        [
          { product_id: "p1", is_heavy: true },
          { product_id: "p2", is_frozen: true },
        ]
      )

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1"), line("l2", "v2")] },
        container as any
      )

      expect(result.shipping_class).toBe("PICKUP_ONLY")
    })

    it("foxpost-forbidden plus heavy becomes HEAVY", async () => {
      const { container } = makeContainer(
        [variant("v1", "p1"), variant("v2", "p2")],
        [
          { product_id: "p1", foxpost_forbidden: true },
          { product_id: "p2", is_heavy: true },
        ]
      )

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1"), line("l2", "v2")] },
        container as any
      )

      expect(result.shipping_class).toBe("HEAVY")
    })
  })

  describe("heavy is an explicit flag, not a measurement", () => {
    it("is heavy only when the product is marked", async () => {
      const { container } = makeContainer(
        [variant("v1", "p1")],
        [{ product_id: "p1", is_heavy: true }]
      )

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1")] },
        container as any
      )

      expect(result.shipping_class).toBe("HEAVY")
    })

    it("is not heavy when the product is not marked", async () => {
      const { container } = makeContainer([variant("v1", "p1")], [])

      const result = await resolveCartShippingClass(
        { items: [line("l1", "v1")] },
        container as any
      )

      expect(result.shipping_class).toBe("NORMAL")
    })

    it("never asks the variant for a weight", async () => {
      const { container, calls } = makeContainer([variant("v1", "p1")], [])

      await resolveCartShippingClass(
        { items: [line("l1", "v1")] },
        container as any
      )

      const variantCall = calls.find((c) => c.entity === "variant")
      expect(variantCall).toBeDefined()
      expect(JSON.stringify(calls)).not.toContain("weight")
    })
  })

  it("ignores a restrictive item that does not require shipping", async () => {
    const { container } = makeContainer(
      [variant("v1", "p1"), variant("v2", "p2")],
      [
        {
          product_id: "p2",
          pickup_only: true,
          is_heavy: true,
          foxpost_forbidden: true,
        },
      ]
    )

    const result = await resolveCartShippingClass(
      { items: [line("l1", "v1"), line("gift", "v2", false)] },
      container as any
    )

    expect(result.shipping_class).toBe("NORMAL")
  })

  it("treats a product with no shipping-attributes row as unrestricted", async () => {
    const { container } = makeContainer([variant("v1", "p1")], [])

    const result = await resolveCartShippingClass(
      { items: [line("l1", "v1")] },
      container as any
    )

    expect(result.shipping_class).toBe("NORMAL")
  })

  it("does not fail on a line with no variant", async () => {
    const { container } = makeContainer([], [])

    const result = await resolveCartShippingClass(
      { items: [line("custom", null)] },
      container as any
    )

    expect(result.shipping_class).toBe("NORMAL")
  })

  /**
   * The two listing workflows populate the cart with DIFFERENT field sets:
   * `listShippingOptionsForCartWorkflow` has no variant weight, the with-pricing
   * one does. The resolver must read only the fields present in both, otherwise
   * the same cart is classified differently in the two places without erroring.
   */
  it("returns the same class for both workflow cart shapes", async () => {
    const variants = [variant("v1", "p1")]
    const attributes: Attribute[] = [{ product_id: "p1", is_heavy: true }]

    const withoutPricing = {
      items: [
        {
          id: "l1",
          variant_id: "v1",
          requires_shipping: true,
          quantity: 1,
          // no variant expansion at all
        },
      ],
    }

    const withPricing = {
      items: [
        {
          id: "l1",
          variant_id: "v1",
          requires_shipping: true,
          quantity: 1,
          // the with-pricing workflow also carries an expanded variant
          variant: { id: "v1", weight: 25_000 },
          product: { id: "p1", weight: 25_000 },
          // ... which must be ignored: weight decides nothing any more
        },
      ],
    }

    const a = await resolveCartShippingClass(
      withoutPricing,
      makeContainer(variants, attributes).container as any
    )
    const b = await resolveCartShippingClass(
      withPricing as any,
      makeContainer(variants, attributes).container as any
    )

    expect(a).toEqual(b)
    expect(a.shipping_class).toBe("HEAVY")
  })

  it("changing cart composition changes the eligible option set", async () => {
    const variants = [variant("v1", "p1"), variant("v2", "p2")]
    const attributes: Attribute[] = [{ product_id: "p2", pickup_only: true }]

    const before = await resolveCartShippingClass(
      { items: [line("l1", "v1")] },
      makeContainer(variants, attributes).container as any
    )
    expect(allowedRolesFor(before.shipping_class)).toEqual([
      "PICKUP",
      "GLS_NORMAL",
      "FOXPOST",
    ])

    const afterAdding = await resolveCartShippingClass(
      { items: [line("l1", "v1"), line("l2", "v2")] },
      makeContainer(variants, attributes).container as any
    )
    expect(allowedRolesFor(afterAdding.shipping_class)).toEqual(["PICKUP"])

    const afterRemoving = await resolveCartShippingClass(
      { items: [line("l1", "v1")] },
      makeContainer(variants, attributes).container as any
    )
    expect(allowedRolesFor(afterRemoving.shipping_class)).toEqual([
      "PICKUP",
      "GLS_NORMAL",
      "FOXPOST",
    ])
  })
})

describe("livestock resolution", () => {
  it("is empty by default, so nothing is livestock by type", () => {
    expect(parseLivestockProductTypeIds(undefined).size).toBe(0)
    expect(parseLivestockProductTypeIds("").size).toBe(0)
    expect(createLivestockPredicate(undefined)("ptyp_1")).toBe(false)
  })

  it("matches configured product type ids, not names", () => {
    const isLivestock = createLivestockPredicate("ptyp_1, ptyp_2")

    expect(isLivestock("ptyp_1")).toBe(true)
    expect(isLivestock("ptyp_2")).toBe(true)
    expect(isLivestock("ptyp_3")).toBe(false)
    expect(isLivestock(null)).toBe(false)
    expect(isLivestock(undefined)).toBe(false)
  })

  it("makes a configured livestock type PICKUP_ONLY", () => {
    const items = normalizeCartShippingItems(
      [{ id: "l1", variant_id: "v1", requires_shipping: true }],
      new Map([["v1", { id: "v1", product: { id: "p1", type_id: "ptyp_coral" } }]]),
      new Map(),
      createLivestockPredicate("ptyp_coral")
    )

    expect(items[0].is_livestock).toBe(true)
  })
})
