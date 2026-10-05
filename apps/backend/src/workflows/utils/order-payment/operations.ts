import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, PaymentCollectionStatus } from "@medusajs/framework/utils"

import { PARENT_ORDER_METADATA_KEY, PICKUP_ORDER_METADATA_KEY } from "../split-completion"
import type { ReleaseHoldOperations, ReleaseSide } from "./release-hold"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "metadata",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.amount",
  "payment_collections.payments.data",
  "payment_collections.payments.created_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.captures.amount",
]

/** One order with every payment of every collection (canceled ones too). */
export const loadOrderPaymentSide = async (
  container: MedusaContainer,
  orderId: string
): Promise<ReleaseSide | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ORDER_FIELDS })
  const order = data?.[0] as any
  if (!order) return null
  return {
    order_id: order.id,
    display_id: order.display_id ?? null,
    metadata: order.metadata ?? null,
    payments: (order.payment_collections ?? []).filter(Boolean).flatMap((collection: any) =>
      (collection.payments ?? []).filter(Boolean).map((payment: any) => ({
        id: payment.id,
        provider_id: payment.provider_id ?? null,
        amount: Number(payment.amount),
        data: payment.data ?? null,
        created_at: payment.created_at ?? null,
        canceled_at: payment.canceled_at ?? null,
        captured_at: payment.captured_at ?? null,
        captured: (payment.captures ?? []).reduce(
          (sum: number, capture: any) => sum + Number(capture?.amount ?? 0),
          0
        ),
        collection_id: collection.id,
        collection_status: collection.status ?? null,
      }))
    ),
  }
}

/** The Medusa side of `releaseHold`. */
export const releaseHoldOperations = (container: MedusaContainer): ReleaseHoldOperations => ({
  loadPair: async (orderId) => {
    const order = await loadOrderPaymentSide(container, orderId)
    if (!order) return null
    // called on the pickup half: its shipped parent pays for both, so it leads
    const parentId = order.metadata?.[PARENT_ORDER_METADATA_KEY]
    if (typeof parentId === "string" && parentId) {
      const parent = await loadOrderPaymentSide(container, parentId)
      if (parent) return { primary: parent, pickup: order }
    }
    const pickupId = order.metadata?.[PICKUP_ORDER_METADATA_KEY]
    const pickup = typeof pickupId === "string" && pickupId ? await loadOrderPaymentSide(container, pickupId) : null
    return { primary: order, pickup }
  },

  cancelPayment: async (paymentId) => {
    await container.resolve(Modules.PAYMENT).cancelPayment(paymentId)
  },

  cancelCollection: async (collectionId) => {
    await container.resolve(Modules.PAYMENT).updatePaymentCollections(collectionId, {
      status: PaymentCollectionStatus.CANCELED,
    })
  },

  setMetadata: async (orderId, metadata) => {
    await container.resolve(Modules.ORDER).updateOrders([{ id: orderId, metadata }])
  },
})
