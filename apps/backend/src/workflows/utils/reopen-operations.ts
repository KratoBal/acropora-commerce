import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../modules/order-business-status/service"
import { GIVEN_BACK_METADATA_KEY, type ReopenOperations } from "./cancel-on-unsuccessful-close"

type OrderQuery = {
  graph(args: { entity: string; fields: string[]; filters: Record<string, unknown> }): Promise<{ data: unknown[] }>
}

/**
 * THE FACTS THE REOPENING CHECK READS (`refuseReopenAfterMovement`): the order's business status, Medusa's order status, and the marker the
 * unsuccessful close leaves. One place, so the transition (which REFUSES the move) and the admin read (which stops OFFERING it) cannot
 * disagree about when an order may be reopened.
 */
export const reopenOperations = (container: MedusaContainer): ReopenOperations => {
  const orderRow = async (orderId: string) =>
    (
      (await container.resolve<OrderQuery>(ContainerRegistrationKeys.QUERY).graph({
        entity: "order",
        fields: ["id", "status", "metadata"],
        filters: { id: orderId },
      })).data[0] as { status?: string; metadata?: Record<string, unknown> | null } | undefined
    ) ?? null
  return {
    currentStatus: async (orderId) => {
      const service = container.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
      return ((await service.listOrderBusinessStatusModels({ order_id: orderId })) as { status?: string }[])[0]?.status ?? null
    },
    orderStatus: async (orderId) => (await orderRow(orderId))?.status ?? null,
    givenBackMarker: async (orderId) => !!(await orderRow(orderId))?.metadata?.[GIVEN_BACK_METADATA_KEY],
  }
}
