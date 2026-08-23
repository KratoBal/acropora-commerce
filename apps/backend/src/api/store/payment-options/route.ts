import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { reconcileCartCashOnDeliveryFeeWorkflow } from "../../../workflows/reconcile-cart-cod-fee"
import { loadCartCashOnDeliveryFeeState } from "../../../workflows/utils/load-cart-cod-fee-state"
import { resolveCartPaymentContext } from "../../../workflows/utils/resolve-cart-payment-context"

/**
 * Which payment methods a cart may use, and what the cash-on-delivery fee would
 * be.
 *
 * The backend is the source of truth: the storefront asks, it does not decide.
 *
 * `cash_on_delivery_fee` is what the cart OWES, which is not the same as what
 * it currently carries. The two are brought together by POST on this same
 * route; this GET only answers, and a storefront must never charge the amount
 * on its own.
 *
 * In practice it is zero until a payment provider is mapped to a role, because
 * `selected_payment_role` cannot be COD before then.
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

/**
 * Bring the cart's cash-on-delivery fee in line with the payment method it has
 * selected.
 *
 * This is the moment of selection, and it needs its own endpoint because
 * Medusa offers no other hold on it: creating a payment session runs
 * `createPaymentSessionsWorkflow` and nothing else, that workflow and every
 * other payment-session workflow and step expose no hook, and none of them
 * refreshes the cart. Choosing a payment method therefore recalculates
 * nothing on its own.
 *
 * The decision is made here, from the payment session stored on the cart. The
 * caller sends a cart id and nothing else: no flag saying cash on delivery was
 * picked, and no amount. Both would be a client telling the backend what to
 * charge.
 *
 * ORDERING, and it matters to the storefront: adding or removing the fee moves
 * the cart total, and Medusa deletes the payment sessions of a cart whose
 * total no longer matches its payment collection. So the payment session the
 * customer just created is gone once the fee lands. The response reports the
 * state AFTER the change for exactly this reason: a `selected_payment_role` of
 * null means the storefront has to initialize the payment session again, now
 * against a total that includes the fee.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.validatedBody as { cart_id: string }

  const { result: plan } = await reconcileCartCashOnDeliveryFeeWorkflow(
    req.scope
  ).run({ input: { cart_id } })

  // Re-read rather than predict. The workflow refreshes the cart, which may
  // drop the payment session, and the storefront needs the state the cart now
  // has, not the one the decision was made from.
  const after = await loadCartCashOnDeliveryFeeState(cart_id, req.scope)

  if (!after) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id ${cart_id} was not found`
    )
  }

  res.json({
    payment_options: {
      allowed_payment_roles: after.context.allowed_payment_roles,
      selected_payment_role: after.context.selected_payment_role,
      cash_on_delivery_fee: after.context.cash_on_delivery_fee,
    },
    cash_on_delivery_fee_line: {
      action: plan.action,
      amount: plan.amount,
      removed_line_ids: plan.removeIds,
      stale_amount: plan.staleAmount,
      reason: plan.reason,
    },
  })
}
