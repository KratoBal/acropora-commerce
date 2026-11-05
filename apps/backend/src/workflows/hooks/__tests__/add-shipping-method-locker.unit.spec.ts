/**
 * THE LOCKER RULE WHEN THE METHOD IS CHOSEN (a82ed229). What must fail: a
 * shop-only cart choosing a GLS locker without an error; a parcel shop refused;
 * the rule reaching a cart without a locker-unsuitable item; the heavy option
 * (it has its own rule, in the provider) or a home delivery looked up.
 */
const handlers = { validate: undefined as undefined | ((...a: any[]) => any) }
const findPickupPoint = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  addShippingMethodToCartWorkflow: {
    hooks: {
      validate: (fn: any) => {
        handlers.validate = fn
      },
    },
  },
}))
jest.mock("../../../services/gls-pickup-points", () => ({
  GlsPickupPointsService: jest.fn().mockImplementation(() => ({
    findPickupPoint: (id: string) => findPickupPoint(id),
  })),
}))

beforeAll(() => {
  require("../add-shipping-method-locker")
})

import { LOCKER_UNSUITABLE_MESSAGE } from "../../utils/locker-rule"
import { resolveShippingOptionRoleBindings } from "../../utils/shipping-option-roles"

const so = (env: string) => resolveShippingOptionRoleBindings().find((b) => b.env === env)!.id

const containerFor = (lockerUnsuitable: boolean) => ({
  resolve: () => ({
    graph: async ({ entity }: { entity: string }) => {
      if (entity === "variant") return { data: [{ id: "v1", product: { id: "p1", type_id: null } }] }
      if (entity === "shipping_attribute")
        return { data: [{ product_id: "p1", locker_unsuitable: lockerUnsuitable }] }
      return { data: [] }
    },
  }),
})

const run = (optionEnv: string, pointId: string | null, lockerUnsuitable: boolean) =>
  handlers.validate!(
    {
      input: {
        cart_id: "cart_1",
        options: [
          { id: so(optionEnv), data: pointId ? { gls_pickup_point: { id: pointId } } : {} },
        ],
      },
      cart: { id: "cart_1", items: [{ id: "l1", variant_id: "v1", requires_shipping: true }] },
    },
    { container: containerFor(lockerUnsuitable) }
  )

beforeEach(() => {
  findPickupPoint.mockReset()
  findPickupPoint.mockImplementation(async (id: string) => ({
    id,
    type: id === "SHOP" ? "parcel-shop" : "parcel-locker",
  }))
})

describe("addShippingMethodToCartWorkflow validate: the parcel-locker rule", () => {
  it("refuses a locker for a cart with an item that does not fit one", async () => {
    await expect(run("ACROPORA_SO_GLS_POINT", "LOCKER", true)).rejects.toThrow(LOCKER_UNSUITABLE_MESSAGE)
  })

  it("takes a parcel shop for that cart, and a locker for any other cart", async () => {
    await expect(run("ACROPORA_SO_GLS_POINT", "SHOP", true)).resolves.toBeUndefined()
    await expect(run("ACROPORA_SO_GLS_POINT", "LOCKER", false)).resolves.toBeUndefined()
  })

  it("does not look up the heavy option or a home delivery", async () => {
    await run("ACROPORA_SO_GLS_HEAVY_POINT", "LOCKER", true)
    await run("ACROPORA_SO_GLS_HOME", null, true)
    expect(findPickupPoint).not.toHaveBeenCalled()
  })
})
