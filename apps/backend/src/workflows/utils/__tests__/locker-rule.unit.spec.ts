import { MedusaError } from "@medusajs/framework/utils"

import {
  LOCKER_UNSUITABLE_MESSAGE,
  assertCartPointsFitLocker,
  methodsBreakingLockerRule,
} from "../locker-rule"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"

/**
 * THE PARCEL-LOCKER RULE (a82ed229). What must fail: a shop-only cart completed
 * on a GLS locker, or on Foxpost; a parcel shop refused; the rule reaching a cart
 * without a locker-unsuitable item; a home delivery counted as a point.
 */
const so = (env: string) => resolveShippingOptionRoleBindings().find((b) => b.env === env)!.id
const GLS_POINT = so("ACROPORA_SO_GLS_POINT")
const GLS_HOME = so("ACROPORA_SO_GLS_HOME")
const FOXPOST = so("ACROPORA_SO_FOXPOST")

const glsMethod = (type: string) => ({
  shipping_option_id: GLS_POINT,
  data: { gls_pickup_point: { id: "P", type } },
})

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

const cart = (methods: object[]) => ({
  items: [{ id: "l1", variant_id: "v1", requires_shipping: true }],
  shipping_methods: methods as never,
})

describe("methodsBreakingLockerRule", () => {
  it("names a GLS locker and Foxpost; a parcel shop and a home delivery pass", () => {
    expect(methodsBreakingLockerRule([glsMethod("parcel-locker")])).toEqual([GLS_POINT])
    expect(methodsBreakingLockerRule([{ shipping_option_id: FOXPOST, data: {} }])).toEqual([FOXPOST])
    expect(methodsBreakingLockerRule([glsMethod("parcel-shop")])).toEqual([])
    expect(methodsBreakingLockerRule([{ shipping_option_id: GLS_HOME, data: {} }])).toEqual([])
    expect(methodsBreakingLockerRule(null)).toEqual([])
  })

  it("a GLS point method without a stored type is not taken for a shop", () => {
    expect(methodsBreakingLockerRule([{ shipping_option_id: GLS_POINT, data: {} }])).toEqual([GLS_POINT])
  })
})

describe("assertCartPointsFitLocker", () => {
  it("refuses a shop-only cart on a locker, with the reason", async () => {
    const attempt = assertCartPointsFitLocker(cart([glsMethod("parcel-locker")]), containerFor(true))
    await expect(attempt).rejects.toThrow(LOCKER_UNSUITABLE_MESSAGE)
    await expect(attempt).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
  })

  it("lets the same cart complete on a parcel shop, and any cart without such an item on a locker", async () => {
    await expect(assertCartPointsFitLocker(cart([glsMethod("parcel-shop")]), containerFor(true))).resolves.toBeUndefined()
    await expect(assertCartPointsFitLocker(cart([glsMethod("parcel-locker")]), containerFor(false))).resolves.toBeUndefined()
  })
})
