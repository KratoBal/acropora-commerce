import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_PROBLEM_REPORT_MODULE } from "../../../modules/order-problem-report"
import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"
import { guestOrderOperations, guestProblemReportsOf, guestWithdrawalsOf } from "../guest-order/operations"

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

const withdrawalCalls: { filter: Record<string, unknown>; config: unknown }[] = []
const withdrawalService = {
  listOrderWithdrawals: async (filter: Record<string, unknown>, config: unknown) => {
    withdrawalCalls.push({ filter, config })
    return [
      {
        id: "ordwdr_1",
        created_at: new Date("2026-11-05T18:00:00Z"),
        item_ids: ["i1"],
        customer_name: "Titkos Név",
        status: "pulled",
      },
    ]
  },
}

const warnings: string[] = []
let reportsFail = false
let withdrawalsFail = false
let orderMetadata: Record<string, Record<string, unknown>> = {}
let noCartLink = false
const container = (calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[]) =>
  ({
    resolve: (key: string) =>
      key === ContainerRegistrationKeys.LOGGER
        ? { warn: (message: string) => warnings.push(message) }
        : key === ORDER_WITHDRAWAL_MODULE
        ? withdrawalsFail
          ? {
              listOrderWithdrawals: async () => {
                throw new TypeError("secret details")
              },
            }
          : withdrawalService
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
        if (q.entity === "order_cart" && q.filters.order_id) return { data: noCartLink ? [] : [{ cart_id: "cart_1" }] }
        if (q.entity === "order_cart" && q.filters.cart_id) return { data: [{ order_id: "o_1" }, { order_id: "o_2" }] }
        if (q.entity === "order" && q.filters.display_id === 1042)
          return { data: [order("o_1", 1042, "so_other", "Bolti átvétel")] }
        if (q.entity === "order" && q.filters.display_id === 2001)
          // a cash on delivery order as query.graph gives it: NO payment_status field, a pending collection
          return {
            data: [
              {
                ...order("o_9", 2001, "so_other"),
                status: "canceled",
                payment_status: undefined,
                payment_collections: [
                  {
                    status: "awaiting",
                    amount: 1000,
                    captured_amount: 0,
                    refunded_amount: 0,
                    payments: [],
                    payment_sessions: [{ provider_id: "pp_acropora_cod" }],
                  },
                ],
              },
            ],
          }
        if (q.entity === "order" && typeof q.filters.id === "string")
          return { data: [{ id: q.filters.id, metadata: orderMetadata[q.filters.id] ?? null }] }
        if (q.entity === "order" && Array.isArray(q.filters.id))
          return { data: q.filters.id.map((id) => order(id, id === "o_2" ? 1043 : 1050, pickupId, "Átvétel")) }
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
    expect(calls[2]).toMatchObject({ entity: "order", filters: { id: "o_1" }, fields: ["id", "metadata"] })
    expect(calls[3]).toMatchObject({ entity: "order", filters: { id: ["o_2"] } })
    expect(mates.map((m) => m.id)).toEqual(["o_2"])
  })

  /*
    THE SPLIT'S OTHER HALF (card d31a66a3, slice 0, measured live on the test shop with orders #160 and #161): the live animal order is
    placed from its own pickup cart, so the two orders share no `order_cart` cart; only the metadata links (`acropora_pickup_order_id`
    on the shipped order, `acropora_parent_order_id` on the pickup order) join them. WHAT TURNS THIS RED: the lookup reading only the
    cart link (a lookup of either order then answers with itself alone, as it did live); a link followed in one direction only; the
    order returned as its own mate; the same order listed twice when a cart link AND a metadata link name it.
  */
  it("follows the split's metadata links in both directions when the orders share no cart", async () => {
    noCartLink = true
    try {
      orderMetadata = { o_1: { acropora_pickup_order_id: "o_2" } }
      const fromParent = await guestOrderOperations(container([])).siblingsOf("o_1")
      expect(fromParent.map((m) => m.id)).toEqual(["o_2"])

      orderMetadata = { o_2: { acropora_parent_order_id: "o_1" } }
      const fromPickup = await guestOrderOperations(container([])).siblingsOf("o_2")
      expect(fromPickup.map((m) => m.id)).toEqual(["o_1"])
    } finally {
      noCartLink = false
      orderMetadata = {}
    }
  })

  it("lists a mate once when the cart link and the metadata link both name it, and never the order itself", async () => {
    try {
      orderMetadata = { o_1: { acropora_pickup_order_id: "o_2", acropora_parent_order_id: "o_1" } }
      const calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[] = []
      const mates = await guestOrderOperations(container(calls)).siblingsOf("o_1")
      expect(mates.map((m) => m.id)).toEqual(["o_2"])
      expect(calls[3]).toMatchObject({ entity: "order", filters: { id: ["o_2"] } })
    } finally {
      orderMetadata = {}
    }
  })

  it("an order with no cart mate and no metadata link has no sibling (the control: the lookup does not invent one)", async () => {
    noCartLink = true
    try {
      expect(await guestOrderOperations(container([])).siblingsOf("o_1")).toEqual([])
    } finally {
      noCartLink = false
    }
  })

  it("computes the payment status from the collections (query.graph has none) and reads the role (acrobot 60746)", async () => {
    const previous = process.env.ACROPORA_PP_COD
    process.env.ACROPORA_PP_COD = "pp_acropora_cod"
    try {
      const calls: { entity: string; filters: Record<string, unknown>; fields: string[] }[] = []
      const source = await guestOrderOperations(container(calls)).findByDisplayId(2001)
      expect(source?.payment_status).toBe("awaiting")
      expect(source?.payment_role).toBe("COD")
      expect(source?.order_status).toBe("canceled")
      const fields = calls.find((call) => call.entity === "order")!.fields
      expect(fields).toEqual(expect.arrayContaining(["payment_collections.status", "payment_collections.captured_amount"]))
      expect(fields).not.toContain("payment_status")
      // Medusa's own order status: a canceled order keeps no link or release kind (guestPaymentKind)
      expect(fields).toContain("status")
    } finally {
      if (previous === undefined) delete process.env.ACROPORA_PP_COD
      else process.env.ACROPORA_PP_COD = previous
    }
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
  it("reads the order's withdrawals by the order id, the oldest first, and keeps only what the view names", async () => {
    withdrawalCalls.length = 0
    const stored = await guestOrderOperations(container([])).withdrawalsOf("o_1")
    expect(withdrawalCalls[0]).toEqual({ filter: { order_id: "o_1" }, config: { order: { created_at: "ASC" } } })
    expect(stored).toEqual([{ id: "ordwdr_1", created_at: new Date("2026-11-05T18:00:00Z"), item_ids: ["i1"] }])
    expect(JSON.stringify(stored)).not.toContain("Titkos")
  })

  it("an unreadable list of withdrawals is an empty list with a log line, not a failed lookup", async () => {
    warnings.length = 0
    withdrawalsFail = true
    try {
      expect(await guestOrderOperations(container([])).withdrawalsOf("o_1")).toEqual([])
    } finally {
      withdrawalsFail = false
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("o_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("secret details")
  })

  it("answers the order's withdrawals in the customer view shape, with no name and no status", async () => {
    const view = await guestWithdrawalsOf(container([]) as never, "o_1")
    expect(view).toEqual([{ id: "ordwdr_1", created_at: "2026-11-05T18:00:00.000Z", item_ids: ["i1"] }])
    expect(JSON.stringify(view)).not.toMatch(/Titkos|customer_name|status/)
  })

  it("an unreadable list is null (the declaration route then leaves the field out), logged by kind only", async () => {
    warnings.length = 0
    withdrawalsFail = true
    try {
      expect(await guestWithdrawalsOf(container([]) as never, "o_1")).toBeNull()
    } finally {
      withdrawalsFail = false
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("secret details")
  })
})
