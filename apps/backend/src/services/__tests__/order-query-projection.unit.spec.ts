import { projectOrderQueryRows } from "../order-query-projection"

const order = (id: string, customer_id: string | null) => ({
  id,
  customer_id,
  display_id: 1,
  created_at: new Date("2026-09-03T10:00:00Z"),
  total: 1_000,
  email: "customer@example.com",
})

describe("order query projection", () => {
  it("derives customer signals from the batched other-order dataset", () => {
    const rows = projectOrderQueryRows({
      pageOrders: [order("order_current", "customer_1")],
      customerOrders: [
        order("order_current", "customer_1"),
        order("order_failed", "customer_1"),
        order("order_open", "customer_1"),
      ],
      statuses: [
        { order_id: "order_current", status: "stocking" },
        { order_id: "order_failed", status: "closed_unsuccessfully" },
        { order_id: "order_open", status: "out_for_delivery" },
      ],
      history: [
        {
          order_id: "order_current",
          to_status: "stocking",
          created_at: new Date("2026-09-03T11:00:00Z"),
        },
      ],
    })

    expect(rows[0].business_status).toEqual({
      code: "stocking",
      label: "Készletezés alatt",
      changed_at: new Date("2026-09-03T11:00:00Z"),
    })
    expect(rows[0].customer_signals).toEqual({
      is_new_customer: false,
      unsuccessful_closed_order_count: 1,
      has_other_open_order: true,
      purchased_without_registration: false,
    })
  })

  it("marks a guest purchase without inventing customer-wide signals", () => {
    const rows = projectOrderQueryRows({
      pageOrders: [order("order_guest", null)],
      customerOrders: [],
      statuses: [],
      history: [],
    })

    expect(rows[0].customer_signals).toEqual({
      is_new_customer: false,
      unsuccessful_closed_order_count: 0,
      has_other_open_order: false,
      purchased_without_registration: true,
    })
  })
})
