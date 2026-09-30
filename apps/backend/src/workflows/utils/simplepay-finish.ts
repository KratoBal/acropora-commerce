import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { SimplePayIpn } from "../../modules/simplepay/ipn"
import { loadCartShippingDecision } from "./load-cart-shipping-decision"
import { PAYMENT_ROLE_PROVIDER_ENV, onlineCardProviderIds } from "./payment-providers"
import { completeSplitCart } from "./split-completion"
import { splitCompletionOperations } from "./split-completion-operations"
import { resolveShippingOptionRoleBindings } from "./shipping-option-roles"
import { cartOfSimplePayTransaction } from "./simplepay-cart"

/**
 * A FINISHED IPN MAKES THE ORDER (P4-3b), even when the customer never comes
 * back to the shop: "Miután az IPN üzenet megérkezik, teljesítheti a
 * megrendelést a kereskedő" (L372).
 *
 * The same completion the storefront uses (`completeSplitCart`), so the order
 * is made once whichever arrives first; a second call finds it made. It asks
 * SimplePay again on the way (the provider authorizes by `query`), so the IPN
 * is never the only evidence.
 *
 * A mixed cart paid by card is split BEFORE the payment starts
 * (`POST /store/carts/:id/simplepay-start`, P4-3c): its orderRef leads to the
 * shipped cart, whose pickup pair carries the same transaction, and
 * `completeSplitCart` completes both without moving anything. A cart still
 * MIXED here was paid as one, and is refused: moving its lines after payment
 * would restart the payment. Refusing makes SimplePay retry, which keeps the
 * case visible.
 */
export const finishSimplePayOrder = async (
  container: MedusaContainer,
  ipn: SimplePayIpn
): Promise<{ order_ids: string[] }> => {
  const cartId = await cartOfSimplePayTransaction(container, ipn.orderRef, ipn.transactionId)

  const decision = await loadCartShippingDecision(cartId, container)
  if (decision?.split_line_ids.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cart ${cartId} is mixed but was paid as one; a mixed cart is split before its card payment starts`
    )
  }

  const storePickup = resolveShippingOptionRoleBindings().find((b) => b.env === "ACROPORA_SO_PICKUP")

  return completeSplitCart(
    cartId,
    splitCompletionOperations(container, { storePickupOptionId: storePickup?.id ?? "" }),
    {
      payAtStoreProviderId: process.env[PAYMENT_ROLE_PROVIDER_ENV.PAY_AT_STORE]?.trim() ?? "",
      onlineCardProviderIds: onlineCardProviderIds(),
    }
  )
}
