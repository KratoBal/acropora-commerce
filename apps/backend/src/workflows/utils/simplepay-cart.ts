import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { sessionIdOfOrderRef } from "../../modules/simplepay/ipn"
import { SIMPLEPAY_DATA_KEY } from "../../modules/simplepay/service"

/**
 * THE CART BEHIND A SIMPLEPAY TRANSACTION, as SimplePay names it (the IPN, or
 * the customer's return): our orderRef leads to the payment session, and the
 * transaction must be the one stored on it. A session replaced by a newer
 * start is gone, so an old transaction finds nothing (NOT_FOUND).
 */
export const cartOfSimplePayTransaction = async (
  container: { resolve: (key: string) => any },
  orderRef: string,
  transactionId: number | string
): Promise<string> => {
  const sessionId = sessionIdOfOrderRef(orderRef)

  if (!sessionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Not our orderRef: ${orderRef}`)
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
  if (String(facts?.transactionId) !== String(transactionId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `The transaction ${transactionId} is not the one on session ${sessionId}`
    )
  }

  return cartId
}
