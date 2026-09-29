import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PAYMENT_ROLE_PROVIDER_ENV } from "../../../../../workflows/utils/payment-providers"
import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"
import { startSharedSplitPayment } from "../../../../../workflows/utils/split-completion"
import { sharedPaymentOperations } from "../../../../../workflows/utils/split-completion-operations"

/**
 * POST /store/carts/:id/simplepay-start
 *
 * Starts ONE card payment for both orders of a mixed cart (P4-3c): the lines
 * are split first, then one SimplePay transaction is started for the two
 * carts together. The answer carries the `payment_url` the customer is sent
 * to, and the totals. The amounts, the payer and the provider are read on the
 * server; the request carries nothing but the cart id.
 *
 * A cart that is not split is paid the ordinary way, and is refused here.
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

  const started = await startSharedSplitPayment(
    req.params.id,
    sharedPaymentOperations(req.scope, { storePickupOptionId: storePickup.id }),
    { providerId: process.env[PAYMENT_ROLE_PROVIDER_ENV.ONLINE_CARD]?.trim() ?? "" }
  )

  res.json(started)
}
