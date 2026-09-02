import { MedusaError, MedusaService } from "@medusajs/framework/utils"

import OrderBusinessStatusHistory from "./models/order-business-status-history"
import OrderBusinessStatusModel from "./models/order-business-status"
import { assertBusinessStatusTransition } from "./transitions"
import {
  OrderBusinessStatus,
  OrderBusinessStatusActor,
  OrderBusinessStatusSource,
} from "./types"

export type TransitionOrderBusinessStatusInput = {
  order_id: string
  to: OrderBusinessStatus
  actor: OrderBusinessStatusActor
  source: OrderBusinessStatusSource
}

class OrderBusinessStatusModuleService extends MedusaService({
  OrderBusinessStatusModel,
  OrderBusinessStatusHistory,
}) {
  async transitionOrderBusinessStatus({
    order_id,
    to,
    actor,
    source,
  }: TransitionOrderBusinessStatusInput) {
    const [current] = await this.listOrderBusinessStatusModels({ order_id })
    const from = (current?.status ?? null) as OrderBusinessStatus | null

    assertBusinessStatusTransition({ from, to, actor, source })

    const status = current
      ? await this.updateOrderBusinessStatusModels({ id: current.id, status: to })
      : await this.createOrderBusinessStatusModels({ order_id, status: to })

    await this.createOrderBusinessStatusHistories({
      order_id,
      from_status: from,
      to_status: to,
      actor,
      source,
    })

    return status
  }

  async retrieveOrderBusinessStatusForOrder(order_id: string) {
    const [status] = await this.listOrderBusinessStatusModels({ order_id })

    if (!status) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No business status exists for order ${order_id}`,
      )
    }

    const history = await this.listOrderBusinessStatusHistories(
      { order_id },
      { order: { created_at: "ASC" } },
    )

    return { status, history }
  }
}

export default OrderBusinessStatusModuleService
