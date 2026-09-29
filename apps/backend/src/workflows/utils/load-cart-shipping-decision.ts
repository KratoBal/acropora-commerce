import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  CartShippingDecision,
  resolveCartShippingClass,
} from "./resolve-cart-shipping-class"

/**
 * The shipping decision for a cart given only its id (P4-2): the hooks that
 * receive a workflow's `input` see `cart_id`, not the cart.
 *
 * It reads exactly the three line fields the resolver needs. `null` when the
 * cart does not exist: the caller decides whether that is an error.
 */
export const loadCartShippingDecision = async (
  cartId: string,
  container: { resolve: (key: string) => any }
): Promise<CartShippingDecision | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "items.id", "items.variant_id", "items.requires_shipping"],
  })

  const cart = carts?.[0]

  if (!cart) {
    return null
  }

  return resolveCartShippingClass(
    {
      items: (cart.items ?? [])
        .filter(Boolean)
        .map((item: any) => ({
          id: item.id,
          variant_id: item.variant_id,
          requires_shipping: item.requires_shipping,
        })),
    },
    container
  )
}
