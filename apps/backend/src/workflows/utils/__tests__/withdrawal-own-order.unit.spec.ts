import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ownOrder } from "../withdrawal/withdrawal"

/*
  WHAT TURNS THIS RED (V0.3, the signed-in customer's order). The lookup filtered by anything but the customer id the
  caller passes (the session's); another customer's order returned; an order whose customer differs accepted when the
  query layer ignores the filter; an empty customer or order id reaching the query.
*/
const ORDERS = [
  { id: "ord_a", display_id: 1042, email: "a@example.hu", customer_id: "cus_a", items: [{ id: "li_1" }, null, { id: "li_2" }] },
  { id: "ord_b", display_id: 1043, email: "b@example.hu", customer_id: "cus_b", items: [{ id: "li_3" }] },
]

const container = (honorFilter = true) => {
  const filters: unknown[] = []
  const graph = jest.fn(async ({ filters: f }: { filters: { id: string; customer_id: string } }) => {
    filters.push(f)
    return {
      data: ORDERS.filter((o) => !honorFilter || (o.id === f.id && o.customer_id === f.customer_id)),
    }
  })
  return {
    filters,
    graph,
    scope: { resolve: (key: string) => (key === ContainerRegistrationKeys.QUERY ? { graph } : undefined) } as never,
  }
}

describe("ownOrder", () => {
  it("opens the customer's own order with the line ids, the number and the address", async () => {
    const c = container()
    expect(await ownOrder(c.scope, "cus_a", "ord_a")).toEqual({
      id: "ord_a",
      itemIds: ["li_1", "li_2"],
      displayId: 1042,
      email: "a@example.hu",
    })
    expect(c.filters).toEqual([{ id: "ord_a", customer_id: "cus_a" }])
  })

  it("answers null for another customer's order, the same as for an order that does not exist", async () => {
    const c = container()
    expect(await ownOrder(c.scope, "cus_a", "ord_b")).toBeNull()
    expect(await ownOrder(c.scope, "cus_a", "ord_none")).toBeNull()
  })

  it("answers null even when the query layer ignores the filter and hands back someone else's order", async () => {
    const c = container(false)
    expect(await ownOrder(c.scope, "cus_a", "ord_b")).toBeNull()
  })

  it("does not query at all without a customer id or an order id", async () => {
    const c = container()
    expect(await ownOrder(c.scope, "", "ord_a")).toBeNull()
    expect(await ownOrder(c.scope, "cus_a", "")).toBeNull()
    expect(c.graph).not.toHaveBeenCalled()
  })
})
