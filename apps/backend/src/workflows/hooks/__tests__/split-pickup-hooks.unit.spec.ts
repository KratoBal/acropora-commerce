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

// The hook files register at load time; they are required only after
// `handlers` exists (jest hoists the mock above it, and a static import would
// run the registration before the object is initialized).
beforeAll(() => {
  require("../split-shipping-pricing-context")
  require("../complete-cart-cod-fee")
})
const AszfRekord = { idopont: "2026-10-27T12:00:00.000Z", verzio: "v", dokumentum: "d" }
import { MIXED_CART_MESSAGE } from "../../utils/assert-cart-not-mixed"
import { LOCKER_UNSUITABLE_MESSAGE } from "../../utils/locker-rule"
import { resolveShippingOptionRoleBindings } from "../../utils/shipping-option-roles"
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
  // the checks below run with the legal documents ready; the gate has its own test in the ÁSZF describe
  const envBefore = { ...process.env }
  beforeEach(() => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = "JPNFMVH0"
    process.env.FOGYASZTOBARAT_ID_EN = "ENSHOP01"
  })
  afterEach(() => {
    process.env = { ...envBefore }
  })

  it("refuses a mixed cart before anything else runs", async () => {
    await expect(
      handlers.completeValidate!(
        {
          cart: {
            metadata: { aszf_elfogadas: AszfRekord },
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

  // a82ed229: the completion's net under the parcel-locker rule (the rule itself: locker-rule.unit.spec.ts)
  it("refuses a cart with a locker-unsuitable item on a GLS locker", async () => {
    const glsPoint = resolveShippingOptionRoleBindings().find((b) => b.env === "ACROPORA_SO_GLS_POINT")!.id
    const graph = async ({ entity, filters }: any) => {
      if (entity === "variant")
        return { data: [{ id: "v1", product: { id: "p1" } }].filter((v) => filters.id.includes(v.id)) }
      if (entity === "shipping_attribute")
        return { data: [{ product_id: "p1", locker_unsuitable: true }] }
      return { data: [] }
    }
    await expect(
      handlers.completeValidate!(
        {
          cart: {
            id: "cart_1",
            metadata: { aszf_elfogadas: AszfRekord },
            items: [{ id: "l1", variant_id: "v1", requires_shipping: true }],
            shipping_methods: [
              { shipping_option_id: glsPoint, data: { gls_pickup_point: { id: "L", type: "parcel-locker" } } },
            ],
          },
        },
        { container: { resolve: () => ({ graph }) } }
      )
    ).rejects.toThrow(LOCKER_UNSUITABLE_MESSAGE)
  })

  it("refuses a cart whose card payment is not its total (P4-3c)", async () => {
    const graph = async ({ entity, filters }: any) => {
      if (entity === "cart")
        return {
          data: [
            {
              id: "cart_1",
              total: 4950,
              metadata: { aszf_elfogadas: AszfRekord },
              items: [{ id: "l1", variant_id: "v1", requires_shipping: true }],
              payment_collection: {
                payment_sessions: [{ data: { id: "pi_1", stripe_share: { transactionId: "pi_1", total: 5000, own: 5000 } } }],
              },
            },
          ],
        }
      if (entity === "variant")
        return { data: [{ id: "v1", product: { id: "p1" } }].filter((v) => filters.id.includes(v.id)) }
      return { data: [] }
    }

    await expect(
      handlers.completeValidate!(
        {
          cart: {
            id: "cart_1",
            metadata: { aszf_elfogadas: AszfRekord },
            items: [{ id: "l1", variant_id: "v1", requires_shipping: true }],
          },
        },
        { container: { resolve: () => ({ graph }) } }
      )
    ).rejects.toThrow("the cart's total is 4950")
  })

  /**
   * THE ÁSZF NET UNDER EVERY WAY OF PLACING AN ORDER (audit A4). What must
   * fail: a cart without the server-written record completing through the
   * stock `/complete` route or either half of `complete-split`; the card path
   * (its record was required when the session was made) stopped here.
   */
  describe("the ÁSZF record", () => {
    const kosar = (metadata: unknown, sessions: unknown[] = []) => ({
      id: "cart_1",
      metadata,
      items: [{ id: "l1", variant_id: "v1", requires_shipping: true }],
      payment_collection: { payment_sessions: sessions },
    })
    const container = {
      resolve: () => ({
        graph: async ({ entity, filters }: any) =>
          entity === "variant"
            ? { data: [{ id: "v1", product: { id: "p1" } }].filter((v) => filters.id.includes(v.id)) }
            : { data: [] },
      }),
    }

    it("a cart without the record is not turned into an order, with a Hungarian message", async () => {
      for (const metadata of [null, {}, { aszf_elfogadas: "igen" }]) {
        await expect(
          handlers.completeValidate!({ cart: kosar(metadata) }, { container })
        ).rejects.toThrow("Az ÁSZF elfogadása nélkül a rendelés nem adható le.")
      }
    })

    it("the same on a cash on delivery or pay-at-store session", async () => {
      await expect(
        handlers.completeValidate!(
          { cart: kosar({}, [{ provider_id: "pp_acropora_cod", status: "pending" }]) },
          { container }
        )
      ).rejects.toThrow("Az ÁSZF elfogadása nélkül")
    })

    it("a card session passes this check: its record was required when the session was made", async () => {
      await expect(
        handlers.completeValidate!(
          { cart: kosar({}, [{ provider_id: "pp_stripe_stripe", status: "pending" }]) },
          { container }
        )
      ).resolves.not.toThrow()
    })

    it("with the record it passes", async () => {
      await expect(
        handlers.completeValidate!({ cart: kosar({ aszf_elfogadas: AszfRekord }) }, { container })
      ).resolves.not.toThrow()
    })

    it("test mode on a test shop: the order passes without Fogyasztóbarát, with the test-mode record; on the live shop it does not", async () => {
      delete process.env.FOGYASZTOBARAT_ENABLED
      delete process.env.FOGYASZTOBARAT_ID_EN
      process.env.LEGAL_GATE_MODE = "test"
      process.env.ACROPORA_STOREFRONT_URL = "https://shop-staging.acropora.hu"
      const testRecord = { ...AszfRekord, verzio: "teszt-mod", teszt_mod: true }
      await expect(
        handlers.completeValidate!({ cart: kosar({ aszf_elfogadas: testRecord }) }, { container })
      ).resolves.not.toThrow()
      await expect(handlers.completeValidate!({ cart: kosar({}) }, { container })).rejects.toThrow("Az ÁSZF elfogadása nélkül")
      process.env.ACROPORA_STOREFRONT_URL = "https://shop.acropora.hu"
      await expect(
        handlers.completeValidate!({ cart: kosar({ aszf_elfogadas: testRecord }) }, { container })
      ).rejects.toThrow("nincs közzétéve")
    })

    it("the legal documents gate: no English source, no order, even with the record and on the card path", async () => {
      process.env.FOGYASZTOBARAT_ID_EN = ""
      for (const sessions of [[], [{ provider_id: "pp_stripe_stripe", status: "pending" }]]) {
        await expect(
          handlers.completeValidate!({ cart: kosar({ aszf_elfogadas: AszfRekord }, sessions) }, { container })
        ).rejects.toThrow("nincs közzétéve")
      }
    })
  })
})
