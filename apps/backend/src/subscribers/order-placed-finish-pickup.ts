import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { finishPickupAfterOrderPlaced } from "../workflows/utils/finish-pickup-after-order-placed"
import {
  PAYMENT_ROLE_PROVIDER_ENV,
  onlineCardProviderIds,
} from "../workflows/utils/payment-providers"
import { completeSplitCart } from "../workflows/utils/split-completion"
import { splitCompletionOperations } from "../workflows/utils/split-completion-operations"
import { resolveShippingOptionRoleBindings } from "../workflows/utils/shipping-option-roles"

/**
 * A mixed cart's pickup order is finished when its shipped order is placed,
 * whoever placed it (the customer's route or Medusa's Stripe webhook). See
 * `finishPickupAfterOrderPlaced`.
 *
 * A failure is logged with the order's id, not thrown: the shipped order is
 * placed either way, and the log is what lets the pickup be finished by hand.
 */
export default async function orderPlacedFinishPickup({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) return

  try {
    const result = await finishPickupAfterOrderPlaced(orderId, {
      cartOf: async (id) => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "order_cart",
          filters: { order_id: id },
          fields: ["cart.id", "cart.metadata"],
        })
        const cart = (data?.[0] as any)?.cart
        return cart?.id ? { id: cart.id, metadata: cart.metadata ?? null } : null
      },
      completeSplit: async (cartId) => {
        const storePickup = resolveShippingOptionRoleBindings().find(
          (binding) => binding.env === "ACROPORA_SO_PICKUP"
        )
        if (!storePickup) throw new Error("the store pickup option is not bound")
        return completeSplitCart(
          cartId,
          splitCompletionOperations(container, { storePickupOptionId: storePickup.id }),
          {
            payAtStoreProviderId:
              process.env[PAYMENT_ROLE_PROVIDER_ENV.PAY_AT_STORE]?.trim() ?? "",
            onlineCardProviderIds: onlineCardProviderIds(),
          }
        )
      },
    })
    if (result.finished) {
      logger.info(`Order ${orderId}: the split's orders are ${result.order_ids.join(", ")}.`)
    }
  } catch (error) {
    logger.error(
      `Order ${orderId} was placed, but its pickup order could not be finished: ${
        error instanceof Error ? error.message : String(error)
      }. Finish it with POST /store/carts/<cart>/complete-split.`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
