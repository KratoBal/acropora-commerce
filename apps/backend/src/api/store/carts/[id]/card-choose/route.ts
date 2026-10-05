import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"
import { chooseCardPayment } from "../../../../../workflows/utils/split-completion"
import { sharedPaymentOperations } from "../../../../../workflows/utils/split-completion-operations"

/**
 * POST /store/carts/:id/card-choose
 *
 * The customer chose card payment for a mixed cart in the payment step. The
 * earlier payment session and the cash-on-delivery fee go, so the review shows
 * what the card will be charged; no payment starts here. It starts at
 * placement (`stripe-start`), where the cart is split and one PaymentIntent
 * covers both orders.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storePickup = resolveShippingOptionRoleBindings().find(
    (binding) => binding.env === "ACROPORA_SO_PICKUP"
  )

  if (!storePickup) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The store pickup option is not bound")
  }

  await chooseCardPayment(
    req.params.id,
    sharedPaymentOperations(req.scope, { storePickupOptionId: storePickup.id })
  )

  res.json({ ok: true })
}
