import {
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../modules/order-business-status/types"

type QueryOrder = {
  id: string
  customer_id: string | null
  display_id: number
  created_at: Date
  total: number
  email: string
  shipping_methods?: { name: string }[]
  payment_collections?: { payments?: { provider_id: string }[] }[]
}

type QueryStatus = {
  order_id: string
  status: OrderBusinessStatus
}

type QueryStatusHistory = {
  order_id: string
  to_status: OrderBusinessStatus
  created_at: Date
}

export type OrderQueryRow = {
  id: string
  display_id: number
  created_at: Date
  total: number
  email: string
  business_status: {
    code: OrderBusinessStatus | null
    label: string | null
    changed_at: Date | null
  }
  shipping_method: string | null
  payment_method: string | null
  invoice_status: null
  customer_signals: {
    is_new_customer: boolean
    unsuccessful_closed_order_count: number
    has_other_open_order: boolean
    purchased_without_registration: boolean
  }
}

const isOpen = (status: OrderBusinessStatus | undefined) =>
  status !== "closed" && status !== "closed_unsuccessfully"

/**
 * Joins page rows to three already-batched datasets. No database access is
 * permitted here: that keeps the per-page query budget observable in the
 * loader and prevents a future row-level lookup from slipping in.
 */
export const projectOrderQueryRows = ({
  pageOrders,
  customerOrders,
  statuses,
  history,
}: {
  pageOrders: QueryOrder[]
  customerOrders: QueryOrder[]
  statuses: QueryStatus[]
  history: QueryStatusHistory[]
}): OrderQueryRow[] => {
  const statusByOrderId = new Map(
    statuses.map((status) => [status.order_id, status.status]),
  )
  const latestHistoryByOrderId = new Map<string, QueryStatusHistory>()

  for (const event of history) {
    const latest = latestHistoryByOrderId.get(event.order_id)

    if (!latest || latest.created_at < event.created_at) {
      latestHistoryByOrderId.set(event.order_id, event)
    }
  }

  const ordersByCustomerId = new Map<string, QueryOrder[]>()

  for (const order of customerOrders) {
    if (!order.customer_id) {
      continue
    }

    const customerOrders = ordersByCustomerId.get(order.customer_id) ?? []
    customerOrders.push(order)
    ordersByCustomerId.set(order.customer_id, customerOrders)
  }

  return pageOrders.map((order) => {
    const status = statusByOrderId.get(order.id)
    const latestHistory = latestHistoryByOrderId.get(order.id)
    const customerOrders = order.customer_id
      ? ordersByCustomerId.get(order.customer_id) ?? []
      : []
    const otherOrders = customerOrders.filter(
      (customerOrder) => customerOrder.id !== order.id,
    )

    return {
      id: order.id,
      display_id: order.display_id,
      created_at: order.created_at,
      total: order.total,
      email: order.email,
      business_status: {
        code: status ?? null,
        label: status ? ORDER_BUSINESS_STATUS_LABELS[status] : null,
        changed_at: latestHistory?.created_at ?? null,
      },
      shipping_method: order.shipping_methods?.[0]?.name ?? null,
      payment_method: order.payment_collections?.[0]?.payments?.[0]?.provider_id ?? null,
      invoice_status: null,
      customer_signals: {
        is_new_customer: !!order.customer_id && customerOrders.length === 1,
        unsuccessful_closed_order_count: otherOrders.filter(
          (otherOrder) =>
            statusByOrderId.get(otherOrder.id) === "closed_unsuccessfully",
        ).length,
        has_other_open_order: otherOrders.some((otherOrder) =>
          isOpen(statusByOrderId.get(otherOrder.id)),
        ),
        purchased_without_registration: !order.customer_id,
      },
    }
  })
}
