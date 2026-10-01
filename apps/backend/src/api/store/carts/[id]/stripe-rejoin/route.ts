import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"
import { rejoinAndClearSharedSplit } from "../../../../../workflows/utils/split-completion"
import { sharedPaymentOperations } from "../../../../../workflows/utils/split-completion-operations"

/**
 * POST /store/carts/:id/stripe-rejoin
 *
 * A SHARED STRIPE PAYMENT THAT DID NOT HAPPEN (the card was refused, or the
 * customer turned back after `stripe-start`). The pickup lines go back to the
 * cart the customer chose them in, and both carts' payment sessions are
 * dropped: the shipped session's drop cancels the joint PaymentIntent, so no
 * hold stays on the card; the pickup session's drop touches nothing (it only
 * joined). Then any payment method can be chosen again, on the whole cart.
 *
 * Safe on a cart that is not split, completed, or not shared: nothing moves.
 * The request carries nothing but the cart id.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storePickup = resolveShippingOptionRoleBindings().find(
    (binding) => binding.env === "ACROPORA_SO_PICKUP"
  )

  if (!storePickup) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The store pickup option is not bound"
    )
  }

  const { rejoined } = await rejoinAndClearSharedSplit(
    req.params.id,
    sharedPaymentOperations(req.scope, { storePickupOptionId: storePickup.id })
  )

  res.json({ rejoined })
}
