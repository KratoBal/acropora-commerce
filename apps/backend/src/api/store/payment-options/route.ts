import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { resolveCartPaymentContext } from "../../../workflows/utils/resolve-cart-payment-context"

/**
 * Which payment methods a cart may use, and what the cash-on-delivery fee would
 * be.
 *
 * The backend is the source of truth: the storefront asks, it does not decide.
 *
 * `cash_on_delivery_fee` is a REPORTED amount, not a charged one. Nothing adds
 * it to a cart: the mechanism that used to do so represented the fee as a
 * negative discount, which was rejected, and the replacement is not built yet.
 * The field stays because the amount is the surviving business rule and the
 * storefront contract should not move twice, but a storefront must not charge
 * it on its own.
 *
 * In practice it is zero today for a second reason as well: no payment provider
 * is mapped to a role, so `selected_payment_role` is never COD.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.validatedQuery as { cart_id: string }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cart_id },
    fields: [
      "id",
      "shipping_methods.shipping_option_id",
      "payment_collection.payment_sessions.provider_id",
    ],
  })

  const cart = carts?.[0]

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id ${cart_id} was not found`
    )
  }

  const context = await resolveCartPaymentContext(cart, req.scope)

  res.json({
    payment_options: {
      allowed_payment_roles: context.allowed_payment_roles,
      selected_payment_role: context.selected_payment_role,
      cash_on_delivery_fee: context.cash_on_delivery_fee,
    },
  })
}
