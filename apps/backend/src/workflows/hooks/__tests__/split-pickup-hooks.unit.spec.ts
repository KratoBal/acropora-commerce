/**
 * THE P4-2 HOOK REGISTRATIONS. What must fail: the split-off lines reaching
 * only one of the two pricing paths (the checkout would show one price and
 * charge another); a mixed cart completed as ONE order.
 */
const handlers = {
  calculate: undefined as undefined | ((...a: any[]) => any),
  listWithPricing: undefined as undefined | ((...a: any[]) => any),
  completeValidate: undefined as undefined | ((...a: any[]) => any),
}

jest.mock("@medusajs/medusa/core-flows", () => ({
  calculateShippingOptionsPricesWorkflow: {
    hooks: {
      setCalculatedShippingPricingContext: (fn: any) => {
        handlers.calculate = fn
      },
    },
  },
  listShippingOptionsForCartWithPricingWorkflow: {
    hooks: {
      setCalculatedShippingPricingContext: (fn: any) => {
        handlers.listWithPricing = fn
      },
    },
  },
  completeCartWorkflow: {
    hooks: {
      validate: (fn: any) => {
        handlers.completeValidate = fn
      },
    },
  },
}))

import "../split-shipping-pricing-context"
import "../complete-cart-cod-fee"
import { MIXED_CART_MESSAGE } from "../../utils/assert-cart-not-mixed"
import { SPLIT_LINE_IDS_CONTEXT_KEY } from "../../utils/split-pricing-context"

// A cart with an ordinary line (l1) and a pickup-only line (l2).
const containerFor = (withCart = true) => ({
  resolve: () => ({
    graph: async ({ entity, filters }: any) => {
      if (entity === "cart")
        return {
          data: withCart
            ? [
                {
                  id: "cart_1",
                  items: [
                    { id: "l1", variant_id: "v1", requires_shipping: true },
                    { id: "l2", variant_id: "v2", requires_shipping: true },
                  ],
                },
              ]
            : [],
        }
      if (entity === "variant")
        return {
          data: [
            { id: "v1", product: { id: "p1" } },
            { id: "v2", product: { id: "p2" } },
          ].filter((v) => filters.id.includes(v.id)),
        }
      return {
        data: [{ product_id: "p2", pickup_only: true }].filter((a) =>
          filters.product_id.includes(a.product_id)
        ),
      }
    },
  }),
})

describe("the split pricing hook", () => {
  it("is registered on both pricing paths", () => {
    expect(handlers.calculate).toBeDefined()
    expect(handlers.listWithPricing).toBeDefined()
  })

  it.each(["calculate", "listWithPricing"] as const)(
    "%s passes the split-off lines of the cart",
    async (which) => {
      const answer = await handlers[which]!(
        { input: { cart_id: "cart_1" } },
        { container: containerFor() }
      )
      expect(answer.output).toEqual({ [SPLIT_LINE_IDS_CONTEXT_KEY]: ["l2"] })
    }
  )

  it("passes nothing without a cart", async () => {
    const noId = await handlers.calculate!({ input: {} }, { container: containerFor() })
    expect(noId.output).toEqual({})
    const missing = await handlers.calculate!(
      { input: { cart_id: "cart_x" } },
      { container: containerFor(false) }
    )
    expect(missing.output).toEqual({ [SPLIT_LINE_IDS_CONTEXT_KEY]: [] })
  })
})

describe("completing a cart", () => {
  it("refuses a mixed cart before anything else runs", async () => {
    await expect(
      handlers.completeValidate!(
        {
          cart: {
            items: [
              { id: "l1", variant_id: "v1", requires_shipping: true },
              { id: "l2", variant_id: "v2", requires_shipping: true },
            ],
          },
        },
        { container: containerFor() }
      )
    ).rejects.toThrow(MIXED_CART_MESSAGE)
  })
})
