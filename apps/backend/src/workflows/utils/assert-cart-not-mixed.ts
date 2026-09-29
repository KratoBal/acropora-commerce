import { MedusaError } from "@medusajs/framework/utils"

import {
  CartForShipping,
  resolveCartShippingClass,
} from "./resolve-cart-shipping-class"

export const MIXED_CART_MESSAGE =
  "This cart has pickup-only and shipped items together; it is completed as two orders, not one."

/**
 * A MIXED CART IS NEVER COMPLETED AS ONE ORDER (P4-2).
 *
 * Since the split, a mixed cart shows the courier options for its shipped
 * lines. Completed as one order, a live animal would leave on a courier
 * method. The split completion moves the pickup lines to their own cart first,
 * so by the time either cart is completed neither is mixed, and this passes.
 */
export const assertCartNotMixed = async (
  cart: CartForShipping,
  container: { resolve: (key: string) => any }
) => {
  const { split_line_ids } = await resolveCartShippingClass(cart, container)

  if (split_line_ids.length) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, MIXED_CART_MESSAGE)
  }
}
