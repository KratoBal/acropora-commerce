import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PAYMENT_ROLE_PROVIDER_ENV, onlineCardProviderIds } from "./payment-providers"
import { resolveShippingOptionRoleBindings } from "./shipping-option-roles"
import { completeSplitCart } from "./split-completion"
import { splitCompletionOperations } from "./split-completion-operations"

/** The cart an order was placed from, with its metadata; null if none. */
export const cartOfOrder = async (
  container: MedusaContainer,
  orderId: string
): Promise<{ id: string; metadata: Record<string, unknown> | null } | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order_cart",
    filters: { order_id: orderId },
    fields: ["cart.id", "cart.metadata"],
  })
  const cart = (data?.[0] as any)?.cart
  return cart?.id ? { id: cart.id, metadata: cart.metadata ?? null } : null
}

/**
 * The split's completion as the `complete-split` route runs it (idempotent,
 * locked): used by every `order.placed` subscriber that needs both orders.
 */
export const completeSplitForCart = async (container: MedusaContainer, cartId: string) => {
  const storePickup = resolveShippingOptionRoleBindings().find(
    (binding) => binding.env === "ACROPORA_SO_PICKUP"
  )
  if (!storePickup) throw new Error("the store pickup option is not bound")
  return completeSplitCart(
    cartId,
    splitCompletionOperations(container, { storePickupOptionId: storePickup.id }),
    {
      payAtStoreProviderId: process.env[PAYMENT_ROLE_PROVIDER_ENV.PAY_AT_STORE]?.trim() ?? "",
      onlineCardProviderIds: onlineCardProviderIds(),
    }
  )
}
