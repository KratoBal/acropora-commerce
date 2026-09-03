import { loadOrderQueryPage } from "../order-query-loader"

const order = (id: string, customer_id: string) => ({
  id,
  customer_id,
  display_id: 1,
  created_at: new Date("2026-09-03T10:00:00Z"),
  total: 1_000,
  email: "customer@example.com",
})

describe("order-query loader", () => {
  it("uses four reads for a twenty-row page, not one extra read per row", async () => {
    const pageOrders = Array.from({ length: 20 }, (_, index) =>
      order(`order_${index}`, `customer_${index}`),
    )
    const loadPage = jest.fn().mockResolvedValue({
      orders: pageOrders,
      count: 20,
      offset: 0,
      limit: 20,
    })
    const loadOrdersForCustomers = jest.fn().mockResolvedValue(pageOrders)
    const loadStatuses = jest.fn().mockResolvedValue([])
    const loadHistory = jest.fn().mockResolvedValue([])

    await loadOrderQueryPage({
      loadPage,
      loadOrdersForCustomers,
      loadStatuses,
      loadHistory,
    })

    expect(loadPage).toHaveBeenCalledTimes(1)
    expect(loadOrdersForCustomers).toHaveBeenCalledTimes(1)
    expect(loadStatuses).toHaveBeenCalledTimes(1)
    expect(loadHistory).toHaveBeenCalledTimes(1)
  })
})
