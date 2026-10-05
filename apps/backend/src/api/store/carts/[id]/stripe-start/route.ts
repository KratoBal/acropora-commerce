import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  onlineCardProviderIds,
  stripeMixedCartEnabled,
} from "../../../../../workflows/utils/payment-providers"
import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"
import { STRIPE_SHARE, startCardPayment } from "../../../../../workflows/utils/split-completion"
import { sharedPaymentOperations } from "../../../../../workflows/utils/split-completion-operations"
import { STRIPE_PROVIDER_ID } from "../../../../../workflows/utils/stripe-config"

/**
 * POST /store/carts/:id/stripe-start
 *
 * The card payment of a mixed cart (Balázs, 2026-10-01: one Stripe payment
 * for both orders). A mixed cart is split BEFORE the
 * card is confirmed, and one PaymentIntent covers both carts (the shipped
 * cart's session starts it, the pickup cart's session joins it); a cart that
 * is not split gets its own intent. The storefront then confirms the card on
 * the shipped cart's session. The provider, the amounts and the split are the
 * server's; the request carries nothing but the cart id.
 *
 * Stripe by name, and only when it is listed for the card role: not listed
 * means not configured. A mixed cart only with ACROPORA_STRIPE_MIXED_CART=true
 * (the lock, `stripeMixedCartEnabled`).
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
    {
      providerId: onlineCardProviderIds().includes(STRIPE_PROVIDER_ID)
        ? STRIPE_PROVIDER_ID
        : "",
      share: STRIPE_SHARE,
      allowSplit: stripeMixedCartEnabled(),
    }
  )

  res.json(started)
}
