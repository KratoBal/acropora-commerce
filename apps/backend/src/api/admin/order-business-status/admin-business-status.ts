import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import { nextBusinessStatuses } from "../../../modules/order-business-status/transitions"
import {
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../../../modules/order-business-status/types"

/**
 * THE BUSINESS STATUS FOR THE ACROPORA OS (its "Rendelések" page). The OS
 * reads it here because there is no module link from the order: the plain
 * `GET /admin/orders` cannot carry it.
 *
 * Unlike the customer view, the history keeps `actor` and `source`: the OS
 * shows who moved the order. `next_statuses` are the steps an admin may take
 * now, from the same table the transition is checked against.
 */
export type AdminOrderBusinessStatusDetail = {
  order_id: string
  status: OrderBusinessStatus
  label: string
  changed_at: string
  next_statuses: { status: OrderBusinessStatus; label: string }[]
  history: {
    from_status: OrderBusinessStatus | null
    from_label: string | null
    to_status: OrderBusinessStatus
    to_label: string
    actor: string
    source: string
    created_at: string
  }[]
}

const label = (status: string): string =>
  ORDER_BUSINESS_STATUS_LABELS[status as OrderBusinessStatus] ?? status

const iso = (value: Date | string): string => new Date(value).toISOString()

export async function adminStatusDetail(
  scope: MedusaContainer,
  orderId: string,
): Promise<AdminOrderBusinessStatusDetail | null> {
  const service = scope.resolve<OrderBusinessStatusModuleService>(
    ORDER_BUSINESS_STATUS_MODULE,
  )
  try {
    const { status, history } =
      await service.retrieveOrderBusinessStatusForOrder(orderId)
    const current = status.status as OrderBusinessStatus
    const latest = history.at(-1)
    return {
      order_id: status.order_id,
      status: current,
      label: label(current),
      // the history's last row is the change; the status row's own time is the fallback
      changed_at: iso(latest?.created_at ?? status.updated_at),
      next_statuses: nextBusinessStatuses(current, "admin").map((to) => ({
        status: to,
        label: label(to),
      })),
      history: history.map((row) => ({
        from_status: (row.from_status as OrderBusinessStatus | null) ?? null,
        from_label: row.from_status ? label(row.from_status) : null,
        to_status: row.to_status as OrderBusinessStatus,
        to_label: label(row.to_status),
        actor: row.actor,
        source: row.source,
        created_at: iso(row.created_at),
      })),
    }
  } catch (error) {
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.NOT_FOUND
    )
      return null
    throw error
  }
}
