import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  CashOnDeliveryFeePlan,
  ReconcilableLineItem,
  planCashOnDeliveryFee,
} from "./cod-fee-reconciliation"
import {
  CartForPayment,
  CartPaymentContext,
  resolveCartPaymentContext,
} from "./resolve-cart-payment-context"

/**
 * Loading everything the cash-on-delivery fee decision needs, in one place.
 *
 * The field list lives here and not at the call sites on purpose. Both callers
 * decide from the same three things (what shipping method is selected, what
 * payment method is selected, what lines the cart carries), and a field missing
 * from one of two hand-maintained lists would not fail: it would quietly change
 * the verdict on that path only.
 */
export const CART_FIELDS_FOR_COD_FEE = [
  "id",
  "items.id",
  "items.unit_price",
  "items.metadata",
  "shipping_methods.shipping_option_id",
  "payment_collection.payment_sessions.provider_id",
] as const

type CartWithFeeLines = CartForPayment & {
  id?: string
  items?: (ReconcilableLineItem | null)[] | null
}

export type CartCashOnDeliveryFeeState = {
  cart: CartWithFeeLines
  context: CartPaymentContext
  plan: CashOnDeliveryFeePlan
}

/**
 * Reads the cart and works out what its fee lines should be.
 *
 * Returns null when the cart is gone. A caller that is repairing a cart has
 * nothing to repair; a caller answering a request turns it into a 404 of its
 * own, with the id in the message.
 */
export const loadCartCashOnDeliveryFeeState = async (
  cartId: string,
  container: { resolve: (key: string) => any }
): Promise<CartCashOnDeliveryFeeState | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: [...CART_FIELDS_FOR_COD_FEE],
  })

  const cart = carts?.[0] as CartWithFeeLines | undefined

  if (!cart) {
    return null
  }

  const context = await resolveCartPaymentContext(cart, container)

  return {
    cart,
    context,
    plan: planCashOnDeliveryFee({
      dueHuf: context.cash_on_delivery_fee,
      items: cart.items,
    }),
  }
}
