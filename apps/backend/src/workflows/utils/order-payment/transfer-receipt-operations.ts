import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import type { TransferReceiptOperations } from "./transfer-receipt"

const FIELDS = [
  "id",
  "payment_collections.payment_sessions.id",
  "payment_collections.payment_sessions.provider_id",
  "payment_collections.payment_sessions.status",
  "payment_collections.payment_sessions.amount",
  "payment_collections.payment_sessions.currency_code",
  "payment_collections.payment_sessions.data",
  "payment_collections.payment_sessions.payment.id",
]

/** `recordTransferReceipt` on Medusa: query for the sessions, the payment module for the rest. */
export const transferReceiptOperations = (container: MedusaContainer): TransferReceiptOperations => ({
  loadSessions: async (orderId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: FIELDS })
    const order = data?.[0] as any
    if (!order) return null
    return (order.payment_collections ?? []).filter(Boolean).flatMap((collection: any) =>
      (collection.payment_sessions ?? []).filter(Boolean).map((session: any) => ({
        id: session.id,
        provider_id: session.provider_id,
        status: session.status,
        amount: Number(session.amount),
        currency_code: session.currency_code,
        data: session.data ?? null,
        payment_id: session.payment?.id ?? null,
      }))
    )
  },
  updateSession: async (input) => {
    await container.resolve(Modules.PAYMENT).updatePaymentSession(input)
  },
  authorizeSession: async (id) => {
    const payment = await container.resolve(Modules.PAYMENT).authorizePaymentSession(id, {})
    return payment ? { payment_id: payment.id } : null
  },
})
