import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  PAYMENT_ROLE_PROVIDER_ENV,
  onlineCardProviderIds,
} from "../../../../../workflows/utils/payment-providers"
import { completeSplitCart } from "../../../../../workflows/utils/split-completion"
import { splitCompletionOperations } from "../../../../../workflows/utils/split-completion-operations"
import { isInsufficientInventory, soldMessage } from "../../../../../workflows/utils/sold-lines"
import { soldUniqueLinesOfCart } from "../../../../../workflows/utils/sold-lines-of-cart"
import { resolveShippingOptionRoleBindings } from "../../../../../workflows/utils/shipping-option-roles"

/**
 * POST /store/carts/:id/complete-split
 *
 * Places a cart (P4-2a2). A mixed cart becomes two orders, the shipped one and
 * a pickup one, linked both ways in metadata; any other cart becomes one
 * order, exactly as `/store/carts/:id/complete` would make it. The storefront
 * calls this instead of the core route, which refuses a mixed cart
 * (`assertCartNotMixed`).
 *
 * The answer lists the orders, the shipped one first. `pending_pickup_cart_id`
 * is set when the shipped order exists but the pickup one does not yet:
 * calling again finishes it, and never makes a second shipped order.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cartId = req.params.id

  const storePickup = resolveShippingOptionRoleBindings().find(
    (binding) => binding.env === "ACROPORA_SO_PICKUP"
  )

  if (!storePickup) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The store pickup option is not bound"
    )
  }

  let result: Awaited<ReturnType<typeof completeSplitCart>>
  try {
    result = await completeSplitCart(
      cartId,
      splitCompletionOperations(req.scope, {
        storePickupOptionId: storePickup.id,
      }),
      {
        payAtStoreProviderId:
          process.env[PAYMENT_ROLE_PROVIDER_ENV.PAY_AT_STORE]?.trim() ?? "",
        onlineCardProviderIds: onlineCardProviderIds(),
      }
    )
  } catch (error) {
    // A unique piece sold while it was in the cart (V2.5): name it, so the storefront can say so. Any other failure goes on
    // unchanged, and so does a shortage that is not on a unique piece.
    if (isInsufficientInventory(error)) {
      const sold = await soldUniqueLinesOfCart(req.scope, cartId)
      if (sold.length > 0)
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, soldMessage(sold))
    }
    throw error
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id: result.order_ids },
    fields: ["id", "display_id"],
  })

  res.json({
    orders: result.order_ids.map((id) => ({
      id,
      display_id:
        (orders ?? []).find((order: any) => order.id === id)?.display_id ?? null,
    })),
    pending_pickup_cart_id: result.pending_pickup_cart_id,
  })
}
