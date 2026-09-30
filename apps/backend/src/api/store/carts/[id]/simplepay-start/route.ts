import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { SIMPLEPAY_PROVIDER_ID } from "../../../../../modules/simplepay"
import { onlineCardProviderIds } from "../../../../../workflows/utils/payment-providers"
import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"
import { startCardPayment } from "../../../../../workflows/utils/split-completion"
import { sharedPaymentOperations } from "../../../../../workflows/utils/split-completion-operations"

/**
 * POST /store/carts/:id/simplepay-start
 *
 * Starts the card payment (P4-3c, P4-4), called at placement, after the
 * customer accepted SimplePay's data-transfer statement. A cart that is not
 * split gets one transaction; a mixed cart is split first, and one
 * transaction covers both carts. The answer carries the `payment_url` the
 * customer is sent to, and the totals. The amounts, the payer and the
 * provider are read on the server; the request carries nothing but the cart
 * id.
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

  const started = await startCardPayment(
    req.params.id,
    sharedPaymentOperations(req.scope, { storePickupOptionId: storePickup.id }),
    // SimplePay by name: the card role may list Stripe too, and this start is
    // SimplePay's. Not listed means not configured, as before.
    {
      providerId: onlineCardProviderIds().includes(SIMPLEPAY_PROVIDER_ID)
        ? SIMPLEPAY_PROVIDER_ID
        : "",
    }
  )

  res.json(started)
}
