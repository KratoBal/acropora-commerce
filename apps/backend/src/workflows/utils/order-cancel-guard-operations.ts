import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"

import type { CancelOrderFacts, OrderCancelOperations } from "./order-cancel-guard"
import { PICKUP_ORDER_METADATA_KEY } from "./split-completion"

const sum = (rows: any[] | undefined) =>
  (rows ?? []).reduce((total: number, row: any) => total + Number(row?.amount ?? 0), 0)

/** The Medusa side of `prepareOrderCancel`. */
export const orderCancelOperations = (
  container: MedusaContainer,
  actorId: string | undefined
): OrderCancelOperations => {
  const paymentsOf = (order: any) =>
    (order?.payment_collections ?? []).flatMap((collection: any) =>
      (collection?.payments ?? []).filter(Boolean)
    )

  return {
    load: async (orderId): Promise<CancelOrderFacts | null> => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const fields = [
        "id",
        "status",
        "metadata",
        "fulfillments.canceled_at",
        "payment_collections.payments.id",
        "payment_collections.payments.data",
        "payment_collections.payments.canceled_at",
        "payment_collections.payments.captures.amount",
        "payment_collections.payments.refunds.amount",
      ]
      const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields })
      const order = data?.[0] as any
      if (!order) return null

      const pickupId = order.metadata?.[PICKUP_ORDER_METADATA_KEY]
      let pickupPaymentLive = false
      if (typeof pickupId === "string" && pickupId) {
        const { data: pickups } = await query.graph({
          entity: "order",
          filters: { id: pickupId },
          fields: ["id", "payment_collections.payments.canceled_at"],
        })
        pickupPaymentLive = paymentsOf(pickups?.[0]).some((payment: any) => !payment.canceled_at)
      }

      return {
        id: order.id,
        status: order.status,
        openFulfillments: (order.fulfillments ?? []).filter((f: any) => f && !f.canceled_at).length,
        pickupPaymentLive,
        payments: paymentsOf(order).map((payment: any) => {
          const captured = sum(payment.captures)
          return {
            id: payment.id,
            captured,
            outstanding: captured - sum(payment.refunds),
            canceled: !!payment.canceled_at,
            data: payment.data ?? null,
          }
        }),
      }
    },

    refund: async (paymentId, amount) => {
      await refundPaymentWorkflow(container).run({
        input: { payment_id: paymentId, amount, created_by: actorId },
      })
    },
  }
}
