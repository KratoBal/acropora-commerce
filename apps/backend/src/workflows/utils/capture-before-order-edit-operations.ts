import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import type { EditCaptureOperations } from "./capture-before-order-edit"
import { sharedCaptureOperations } from "./shared-stripe-capture-operations"
import { PARENT_ORDER_METADATA_KEY } from "./split-completion"

/** The Medusa side of `captureBeforeOrderEdit`. */
export const editCaptureOperations = (container: MedusaContainer): EditCaptureOperations => ({
  ...sharedCaptureOperations(container),

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

    // The same preview the admin shows and the confirm applies.
    const preview = await container.resolve(Modules.ORDER).previewOrderChange(orderId)
    return Number((preview as any).summary?.current_order_total ?? preview.total)
  },

  parentOrderId: async (orderId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: ["id", "metadata"],
    })
    const parent = (data?.[0] as any)?.metadata?.[PARENT_ORDER_METADATA_KEY]
    return typeof parent === "string" && parent ? parent : null
  },

  setCollectionAmount: async (collectionId, amount) => {
    await container.resolve(Modules.PAYMENT).updatePaymentCollections(collectionId, { amount })
  },
})
