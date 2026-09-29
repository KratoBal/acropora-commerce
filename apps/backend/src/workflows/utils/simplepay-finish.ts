import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { SimplePayIpn, sessionIdOfOrderRef } from "../../modules/simplepay/ipn"
import { SIMPLEPAY_DATA_KEY } from "../../modules/simplepay/service"
import { loadCartShippingDecision } from "./load-cart-shipping-decision"
import { PAYMENT_ROLE_PROVIDER_ENV } from "./payment-providers"
import { completeSplitCart } from "./split-completion"
import { splitCompletionOperations } from "./split-completion-operations"
import { resolveShippingOptionRoleBindings } from "./shipping-option-roles"

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
 * A MIXED cart is refused here: paying it by card means one transaction for
 * both orders, and that is P4-3c. Moving its lines after payment would restart
 * the payment. Refusing makes SimplePay retry, which keeps the case visible.
 */
export const finishSimplePayOrder = async (
  container: MedusaContainer,
  ipn: SimplePayIpn
): Promise<{ order_ids: string[] }> => {
  const sessionId = sessionIdOfOrderRef(ipn.orderRef)

  if (!sessionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Not our orderRef: ${ipn.orderRef}`)
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sessions } = await query.graph({
    entity: "payment_session",
    filters: { id: sessionId },
    fields: ["id", "data", "payment_collection.cart.id"],
  })
  const session = sessions?.[0] as
    | { data?: Record<string, unknown>; payment_collection?: { cart?: { id?: string } } }
    | undefined
  const facts = session?.data?.[SIMPLEPAY_DATA_KEY] as { transactionId?: number } | undefined
  const cartId = session?.payment_collection?.cart?.id

  if (!session || !cartId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `No cart for payment session ${sessionId}`)
  }
  if (String(facts?.transactionId) !== String(ipn.transactionId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `The IPN's transaction ${ipn.transactionId} is not the one on session ${sessionId}`
    )
  }

  const decision = await loadCartShippingDecision(cartId, container)
  if (decision?.split_line_ids.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cart ${cartId} is mixed; one card transaction for both orders is not built yet (P4-3c)`
    )
  }

  const storePickup = resolveShippingOptionRoleBindings().find((b) => b.env === "ACROPORA_SO_PICKUP")

  return completeSplitCart(
    cartId,
    splitCompletionOperations(container, { storePickupOptionId: storePickup?.id ?? "" }),
    { payAtStoreProviderId: process.env[PAYMENT_ROLE_PROVIDER_ENV.PAY_AT_STORE]?.trim() ?? "" }
  )
}
