import { MedusaError } from "@medusajs/framework/utils"

import type { ShippingClass } from "./compute-shipping-class"
import {
  CartForShipping,
  resolveCartShippingClass,
} from "./resolve-cart-shipping-class"
import {
  buildShippingOptionRoleMap,
  glsPointOptionOf,
} from "./shipping-option-roles"

/**
 * AN ITEM THAT DOES NOT FIT A PARCEL LOCKER (a82ed229, `locker_unsuitable`).
 *
 * The cart class NO_LOCKER already takes Foxpost away, through the option
 * rules. What a rule cannot say is the second half: the ordinary GLS pickup
 * point option stays, but its point may only be a parcel shop. The option does
 * not decide that (unlike the heavy-goods option), the cart does, so every
 * place that checks a GLS point asks this module too: the point search, adding
 * the shipping method, completing the cart, and changing an order's point.
 */
export const LOCKER_UNSUITABLE_MESSAGE =
  "An item in this cart does not fit a parcel locker: choose a GLS parcel shop instead."

/** Whether the cart's class allows parcel shops only for a GLS pickup point. */
export const shopOnlyFor = (shippingClass: ShippingClass) =>
  shippingClass === "NO_LOCKER"

export const cartIsShopOnly = async (
  cart: CartForShipping,
  container: { resolve: (key: string) => any }
): Promise<boolean> =>
  shopOnlyFor((await resolveCartShippingClass(cart, container)).shipping_class)

type MethodForLocker = {
  shipping_option_id?: string | null
  data?: Record<string, unknown> | null
} | null

/** The stored GLS point's type ("parcel-shop" or "parcel-locker"), if the method has one. */
const glsPointType = (method: NonNullable<MethodForLocker>) => {
  const point = method.data?.gls_pickup_point
  const type = point && typeof point === "object" ? Reflect.get(point, "type") : undefined
  return typeof type === "string" ? type : null
}

/**
 * Pure: the methods a shop-only cart must not complete with. Foxpost is listed
 * too, as a second net: the option rules hide it, but a method chosen before a
 * flag changed would still be on the cart.
 */
export const methodsBreakingLockerRule = (
  methods: MethodForLocker[] | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string[] => {
  const roles = buildShippingOptionRoleMap(env)
  return (methods ?? []).flatMap((method) => {
    const optionId = method?.shipping_option_id
    if (!method || !optionId) return []
    if (roles.get(optionId) === "FOXPOST") return [optionId]
    if (glsPointOptionOf(optionId, env) && glsPointType(method) !== "parcel-shop")
      return [optionId]
    return []
  })
}

/** The completion's net: a shop-only cart does not become an order on a locker. */
export const assertCartPointsFitLocker = async (
  cart: CartForShipping & { shipping_methods?: MethodForLocker[] | null },
  container: { resolve: (key: string) => any }
) => {
  if (!(await cartIsShopOnly(cart, container))) return
  if (methodsBreakingLockerRule(cart.shipping_methods).length) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LOCKER_UNSUITABLE_MESSAGE)
  }
}
