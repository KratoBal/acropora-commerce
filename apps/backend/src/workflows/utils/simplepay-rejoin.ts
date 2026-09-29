import { MedusaError } from "@medusajs/framework/utils"

import { cartOfSimplePayTransaction } from "./simplepay-cart"
import { rejoinSharedSplit } from "./split-completion"
import { splitCompletionOperations } from "./split-completion-operations"
import { resolveShippingOptionRoleBindings } from "./shipping-option-roles"

/**
 * After a SimplePay transaction ended WITHOUT payment (P4-3c3): the split it
 * was for is put back together. A transaction whose session was replaced by a
 * newer start finds nothing, and nothing happens: the newer start owns the
 * cart now.
 */
export const rejoinAfterUnpaidSimplePay = async (
  container: { resolve: (key: string) => any },
  orderRef: string,
  transactionId: number | string
): Promise<{ rejoined: boolean; cart_id: string | null }> => {
  let cartId: string

  try {
    cartId = await cartOfSimplePayTransaction(container, orderRef, transactionId)
  } catch (error) {
    if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) {
      return { rejoined: false, cart_id: null }
    }
    throw error
  }

  const storePickup = resolveShippingOptionRoleBindings().find((b) => b.env === "ACROPORA_SO_PICKUP")
  const { rejoined } = await rejoinSharedSplit(
    cartId,
    splitCompletionOperations(container as never, { storePickupOptionId: storePickup?.id ?? "" })
  )

  return { rejoined, cart_id: cartId }
}
