import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_PROBLEM_REPORT_MODULE } from "../../../modules/order-problem-report"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"
import { guestOrderOperations, guestProblemReportsOf } from "../guest-order/operations"

/*
  WHAT TURNS THIS RED (V1.1). The store pickup flag decided by the shipping option's NAME instead of its id
  (names are translated and edited); a field of the customer's address, name or phone added to the query
  (what is not requested cannot leak); a split cart's mates read from the wrong cart; the order itself
  returned as its own cart-mate.
*/
const pickupId = resolveShippingOptionRoleBindings().find((binding) => binding.role === "PICKUP")!.id

const order = (id: string, displayId: number, optionId: string, name = "Bármi") => ({
  id,
  display_id: displayId,
  email: "vevo@example.hu",
  created_at: "2026-11-03T10:00:00.000Z",
  total: 1000,
  currency_code: "huf",
  payment_status: "captured",
  metadata: null,
  items: [{ id: "i1", title: "Termék", product_title: "Termék", variant_title: "", quantity: 1, total: 1000 }],
  shipping_methods: [{ id: "sm1", name, shipping_option_id: optionId, data: null }],
})

const reportCalls: { filter: Record<string, unknown>; config: unknown }[] = []
const problemService = {
  listOrderProblemReports: async (filter: Record<string, unknown>, config: unknown) => {
    reportCalls.push({ filter, config })
    return [
      {
        id: "ordprb_1",
        kind: "item_missing",
        created_at: new Date("2026-11-04T10:00:00Z"),
        status: "pulled",
        description: "Titkos",
        phone: "+36 1",
        item_ids: ["i1"],
      },
    ]
  },
}

const warnings: string[] = []
let reportsFail = false
const container = (calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[]) =>
  ({
    resolve: (key: string) =>
      key === ContainerRegistrationKeys.LOGGER
        ? { warn: (message: string) => warnings.push(message) }
        : key === ORDER_PROBLEM_REPORT_MODULE
        ? reportsFail
          ? {
              listOrderProblemReports: async () => {
                throw new TypeError("secret details")
              },
            }
          : problemService
        : {
      graph: async (q: { entity: string; filters: Record<string, unknown>; fields: string[] }) => {
        calls.push(q)
        if (q.entity === "order_cart" && q.filters.order_id) return { data: [{ cart_id: "cart_1" }] }
        if (q.entity === "order_cart" && q.filters.cart_id) return { data: [{ order_id: "o_1" }, { order_id: "o_2" }] }
        if (q.entity === "order" && q.filters.display_id === 1042)
          return { data: [order("o_1", 1042, "so_other", "Bolti átvétel")] }
        if (q.entity === "order" && Array.isArray(q.filters.id))
          return { data: [order("o_2", 1043, pickupId, "Átvétel")] }
        return { data: [] }
      },
    },
  }) as never

describe("guestOrderOperations", () => {
  it("the store pickup flag follows the option ID, not the name", async () => {
    const calls: never[] = []
    const ops = guestOrderOperations(container(calls))
    const primary = await ops.findByDisplayId(1042)
    expect(primary?.shipping_method?.name).toBe("Bolti átvétel")
    expect(primary?.shipping_method?.store_pickup).toBe(false)
    const [mate] = await ops.siblingsOf("o_1")
    expect(mate?.shipping_method?.name).toBe("Átvétel")
    expect(mate?.shipping_method?.store_pickup).toBe(true)
  })

  it("reads the cart-mates through the order's own cart, and never returns the order as its own mate", async () => {
    const calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[] = []
    const mates = await guestOrderOperations(container(calls)).siblingsOf("o_1")
    expect(calls[0]).toMatchObject({ entity: "order_cart", filters: { order_id: "o_1" } })
    expect(calls[1]).toMatchObject({ entity: "order_cart", filters: { cart_id: "cart_1" } })
    expect(calls[2]).toMatchObject({ entity: "order", filters: { id: ["o_2"] } })
    expect(mates.map((m) => m.id)).toEqual(["o_2"])
  })

  it("asks for NO address, name or phone field", async () => {
    const calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[] = []
    await guestOrderOperations(container(calls)).findByDisplayId(1042)
    const fields = calls.find((call) => call.entity === "order")!.fields
    expect(fields.length).toBeGreaterThan(5)
    for (const field of fields) expect(field).not.toMatch(/address|phone|first_name|last_name|customer|billing/i)
  })

  it("reads the order's problem reports by the order id, the oldest first, and keeps only what the view names", async () => {
    reportCalls.length = 0
    const stored = await guestOrderOperations(container([])).problemReportsOf("o_1")
    expect(reportCalls[0]).toEqual({ filter: { order_id: "o_1" }, config: { order: { created_at: "ASC" } } })
    expect(stored).toEqual([
      { id: "ordprb_1", kind: "item_missing", created_at: new Date("2026-11-04T10:00:00Z"), status: "pulled" },
    ])
    expect(JSON.stringify(stored)).not.toContain("Titkos")
  })

  it("an unreadable list of reports is an empty list with a log line, not a failed lookup", async () => {
    warnings.length = 0
    reportsFail = true
    try {
      expect(await guestOrderOperations(container([])).problemReportsOf("o_1")).toEqual([])
    } finally {
      reportsFail = false
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("o_1")
    // only the error kind is logged, never its message
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("secret details")
  })

  it("answers the order's reports in the customer view shape, with no text, phone or item", async () => {
    const view = await guestProblemReportsOf(container([]) as never, "o_1")
    expect(view).toEqual([
      { id: "ordprb_1", kind: "item_missing", created_at: "2026-11-04T10:00:00.000Z", stage: "in_progress" },
    ])
    expect(JSON.stringify(view)).not.toMatch(/Titkos|phone|item_ids/)
  })

  it("an unreadable list is null (the report route then leaves the field out), logged by kind only", async () => {
    warnings.length = 0
    reportsFail = true
    try {
      expect(await guestProblemReportsOf(container([]) as never, "o_1")).toBeNull()
    } finally {
      reportsFail = false
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("secret details")
  })
})
