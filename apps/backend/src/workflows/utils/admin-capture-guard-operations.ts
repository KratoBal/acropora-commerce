import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { AdminCaptureOperations } from "./admin-capture-guard"
import { loadSide } from "./shared-stripe-capture-operations"

/** The Medusa side of `guardAdminCapture`. */
export const adminCaptureOperations = (container: MedusaContainer): AdminCaptureOperations => ({
  load: async (paymentId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: payments } = await query.graph({
      entity: "payment",
      filters: { id: paymentId },
      fields: ["id", "provider_id", "amount", "payment_collection_id", "captures.amount"],
    })
    const payment = payments?.[0] as any

    if (!payment) {
      return null
    }

    // The order is reached over the order <-> payment collection link.
    const { data: collections } = await query.graph({
      entity: "payment_collection",
      filters: { id: payment.payment_collection_id },
      fields: ["id", "order.id"],
    })
    const orderId = (collections?.[0] as any)?.order?.id as string | undefined
    const order = orderId ? await loadSide(container, orderId) : null

    return {
      provider_id: payment.provider_id ?? null,
      amount: Number(payment.amount),
      captured: (payment.captures ?? []).reduce(
        (sum: number, capture: any) => sum + Number(capture?.amount ?? 0),
        0
      ),
      // what the order still owes on its hold: a difference paid through a link is not taken twice
      order: order ? { id: order.order_id, total: order.total - (order.other_captured ?? 0) } : null,
    }
  },
})
