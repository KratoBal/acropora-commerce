import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import type { EditHoldOperations } from "./order-edit-hold"
import { sharedCaptureOperations } from "./shared-stripe-capture-operations"

/**
 * One collection moved from one status to another, ONLY if it is in the first
 * one now. The payment module's selector form lists the matching collections
 * and updates those; with the status in the selector, a collection that has
 * moved on (a capture, another edit) is not touched. It answers with the first
 * updated row, or nothing if none matched.
 */
const moveCollection = async (
  container: MedusaContainer,
  collectionId: string,
  from: "authorized" | "awaiting",
  to: "authorized" | "awaiting"
): Promise<boolean> => {
  const updated = await container
    .resolve(Modules.PAYMENT)
    .updatePaymentCollections({ id: collectionId, status: from } as never, { status: to } as never)
  return !!updated
}

/** The Medusa side of `orderEditHoldDecision` and `confirmKeepingHold`. */
export const editHoldOperations = (container: MedusaContainer): EditHoldOperations => ({
  loadPair: sharedCaptureOperations(container).loadPair,

  requestedEditTotal: async (orderId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order_change",
      filters: { order_id: orderId, status: "requested", change_type: "edit" },
      fields: ["id"],
    })

    if (!data?.length) {
      return null
    }

    const preview = await container.resolve(Modules.ORDER).previewOrderChange(orderId)
    return Number((preview as any).summary?.current_order_total ?? preview.total)
  },

  holdCollection: (collectionId) => moveCollection(container, collectionId, "authorized", "awaiting"),
  releaseCollection: (collectionId) => moveCollection(container, collectionId, "awaiting", "authorized"),

  closeOtherOpenCollections: async (orderId, holdCollectionId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: ["payment_collections.id", "payment_collections.status"],
    })
    const open = ((data?.[0] as any)?.payment_collections ?? []).filter(
      (collection: any) =>
        collection?.id !== holdCollectionId && (collection?.status === "not_paid" || collection?.status === "awaiting")
    )
    for (const collection of open) {
      await container
        .resolve(Modules.PAYMENT)
        .updatePaymentCollections({ id: collection.id, status: collection.status } as never, { status: "canceled" } as never)
    }
  },
})
