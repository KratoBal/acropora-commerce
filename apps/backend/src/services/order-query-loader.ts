import { projectOrderQueryRows } from "./order-query-projection"

type QueryOrder = Parameters<typeof projectOrderQueryRows>[0]["pageOrders"][number]
type QueryStatus = Parameters<typeof projectOrderQueryRows>[0]["statuses"][number]
type QueryHistory = Parameters<typeof projectOrderQueryRows>[0]["history"][number]

export type OrderQueryPage = {
  orders: QueryOrder[]
  count: number
  offset: number
  limit: number
}

export type OrderQueryLoader = {
  loadPage: () => Promise<OrderQueryPage>
  loadOrdersForCustomers: (customerIds: string[]) => Promise<QueryOrder[]>
  loadStatuses: (orderIds: string[]) => Promise<QueryStatus[]>
  loadHistory: (orderIds: string[]) => Promise<QueryHistory[]>
}

/**
 * Fixed four-read budget: one page, one customer-order aggregate, one status
 * aggregate and one history aggregate. It never performs a row-level read.
 */
export const loadOrderQueryPage = async (loader: OrderQueryLoader) => {
  const page = await loader.loadPage()
  const orderIds = page.orders.map((order) => order.id)
  const customerIds = [
    ...new Set(
      page.orders.flatMap((order) =>
        order.customer_id ? [order.customer_id] : [],
      ),
    ),
  ]

  const [customerOrders, statuses, history] = await Promise.all([
    loader.loadOrdersForCustomers(customerIds),
    loader.loadStatuses(orderIds),
    loader.loadHistory(orderIds),
  ])

  return {
    orders: projectOrderQueryRows({
      pageOrders: page.orders,
      customerOrders,
      statuses,
      history,
    }),
    count: page.count,
    offset: page.offset,
    limit: page.limit,
  }
}
