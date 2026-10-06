// the factory runs before this file's consts: the call log lives on globalThis
jest.mock("@medusajs/medusa/core-flows", () => {
  const log = ((globalThis as any).__splitCalls ??= []) as Array<[string, unknown]>
  const wf = (name: string, result: unknown = {}) => () => ({
    run: async (args: { input: unknown }) => {
      log.push([name, args.input])
      return { result: typeof result === "function" ? (result as (i: unknown) => unknown)(args.input) : result }
    },
  })
  // the real module for everything else: the import chain composes other workflows at load time
  return {
    ...jest.requireActual("@medusajs/medusa/core-flows"),
    beginOrderEditOrderWorkflow: wf("begin"),
    orderEditUpdateItemQuantityWorkflow: wf("quantities"),
    requestOrderEditRequestWorkflow: wf("request"),
    confirmOrderEditRequestWorkflow: wf("confirm"),
    cancelBeginOrderEditWorkflow: wf("cancelEdit"),
    cancelOrderWorkflow: wf("cancelOrder"),
    createOrderWorkflow: wf("createOrder", (input: { items: Array<{ metadata: unknown }> }) => ({
      id: "order_B",
      total: 2000,
      items: input.items.map((item, n) => ({ id: `ordli_B${n}`, variant_id: n === 0 ? "var_i1" : "var_i2", metadata: item.metadata })),
    })),
    createOrderPaymentCollectionWorkflow: wf("collection", [{ id: "paycol_B" }]),
    createPaymentSessionsWorkflow: wf("session", { id: "payses_B" }),
  }
})
const calls = ((globalThis as any).__splitCalls ??= []) as Array<[string, unknown]>
const decision = jest.fn()
;(globalThis as any).__splitDecision = decision
jest.mock("../../order-edit-hold", () => ({
  orderEditHoldDecision: (...args: unknown[]) => (globalThis as any).__splitDecision(...args),
  confirmKeepingHold: async (_id: string, _ops: unknown, confirm: () => Promise<unknown>) => ({ result: await confirm() }),
}))
jest.mock("../../order-edit-hold-operations", () => ({ editHoldOperations: () => ({}) }))

import { splitOperations } from "../operations"
import type { PlannedLine, SplitSource } from "../split"

const orderRow = {
  id: "order_A",
  status: "pending",
  display_id: 101,
  metadata: { egyeb: 1 },
  region_id: "reg_hu",
  sales_channel_id: "sc_1",
  customer_id: "cus_1",
  email: "vevo@example.test",
  currency_code: "huf",
  shipping_address: { id: "addr_1", first_name: "Vevő", last_name: "Próba", city: "Budapest", created_at: "x" },
  billing_address: { id: "addr_2", first_name: "Vevő", last_name: "Próba" },
  items: [
    { id: "i1", variant_id: "var_i1", title: "Termék 1", quantity: 3, unit_price: 1000, adjustments: [], is_tax_inclusive: true, metadata: null },
    { id: "i2", variant_id: "var_i2", title: "Termék 2", quantity: 1, unit_price: 5000, adjustments: [], is_tax_inclusive: true, metadata: null },
  ],
  shipping_methods: [{ name: "Foxpost csomagpont", shipping_option_id: "so_fox", data: { foxpost_pickup_point: { id: "P1" } } }],
  fulfillments: [],
  payment_collections: [{ payments: [{ provider_id: "pp_acropora_cod", captured_at: null, canceled_at: null }], payment_sessions: [] }],
}

const container = (
  variants: Record<string, unknown> = {},
  stock: { available?: number; held?: number; heldBackorder?: boolean; reserveFails?: boolean } = {}
) => {
  const reservationsMade: unknown[] = []
  const authorized: string[] = []
  const errors: string[] = []
  return {
    reservationsMade,
    authorized,
    errors,
    scope: {
      resolve: (key: string) => {
        if (key === "query")
          return {
            graph: async (q: { entity: string; filters: { id: string }; fields?: string[] }) => {
              if (q.entity === "order" && q.filters.id === "order_A") {
                // Medusa as measured on the test shop (2026-10-06, order #52): without
                // "items.detail.quantity" in the fields the quantity does not load
                const row = JSON.parse(JSON.stringify(orderRow))
                if (!q.fields?.includes("items.detail.quantity"))
                  for (const item of row.items) delete item.quantity
                return { data: [row] }
              }
              if (q.entity === "order") return { data: [{ display_id: 202, total: 2000 }] }
              if (q.entity === "product_variant") return { data: [variants[q.filters.id]] }
              return { data: [] }
            },
          }
        if (key === "order_business_status") return { listOrderBusinessStatusModels: async () => [{ status: "stocking" }] }
        if (key === "inventory")
          return {
            listReservationItems: async () => [
              {
                line_item_id: "i1",
                location_id: "sloc_bolt",
                inventory_item_id: "iitem_1",
                quantity: { value: String(stock.held ?? 3), precision: 20 },
                allow_backorder: stock.heldBackorder ?? false,
              },
            ],
            retrieveAvailableQuantity: async () => stock.available ?? 10,
            createReservationItems: async (r: unknown[]) => {
              if (stock.reserveFails) throw new Error("Not enough stock available for item iitem_1 at location sloc_bolt")
              reservationsMade.push(...r)
            },
          }
        if (key === "payment") return { authorizePaymentSession: async (id: string) => authorized.push(id) }
        if (key === "order") return { updateOrders: async () => undefined }
        if (key === "logger") return { error: (m: string) => errors.push(m), info: () => undefined, warn: () => undefined }
        throw new Error(`unexpected resolve ${key}`)
      },
    } as never,
  }
}

const env = process.env
beforeEach(() => {
  calls.length = 0
  decision.mockReset()
  process.env = { ...env, ACROPORA_PP_COD: "pp_acropora_cod" }
})
afterAll(() => {
  process.env = env
})

describe("loadOrder", () => {
  it("reads the payment kind, whether it is paid, the business status and where each line is reserved", async () => {
    const source = await splitOperations(container().scope).loadOrder("order_A")
    expect(source).toMatchObject({
      id: "order_A",
      business_status: "stocking",
      payment_role: "COD",
      paid: false,
      reservation_locations: { i1: "sloc_bolt" },
    })
  })

  // the order's lines as query.graph may give them; restored after each case
  const withItems = async (items: unknown[], run: () => Promise<void>) => {
    const original = orderRow.items
    orderRow.items = items as typeof orderRow.items
    try {
      await run()
    } finally {
      orderRow.items = original
    }
  }

  it("quantities and prices in Medusa's raw { value, precision } form are plain numbers, never NaN (the test shop's null split)", async () => {
    await withItems(
      [
        {
          id: "i1",
          variant_id: "var_i1",
          title: "Termék 1",
          quantity: { value: "1", precision: 20 },
          unit_price: { value: "10500", precision: 20 },
          adjustments: [],
          is_tax_inclusive: true,
          metadata: null,
        },
        { id: "i2", variant_id: "var_i2", title: "Termék 2", quantity: "1", unit_price: 4800, adjustments: null, is_tax_inclusive: true, metadata: null },
      ],
      async () => {
        const source = await splitOperations(container().scope).loadOrder("order_A")
        expect(source!.items.map(({ id, quantity, unit_price, discount_total }) => ({ id, quantity, unit_price, discount_total }))).toEqual([
          { id: "i1", quantity: 1, unit_price: 10500, discount_total: 0 },
          { id: "i2", quantity: 1, unit_price: 4800, discount_total: 0 },
        ])
      }
    )
  })

  it("a line's discount is the sum of its adjustments, so a discounted line is still refused", async () => {
    await withItems(
      [{ ...orderRow.items[0], adjustments: [{ amount: { value: "150", precision: 20 } }, { amount: 50 }] }, orderRow.items[1]],
      async () => {
        const source = await splitOperations(container().scope).loadOrder("order_A")
        expect(source!.items[0].discount_total).toBe(200)
      }
    )
  })

  it("a quantity that did not load stops the split loudly instead of counting as 0 or NaN", async () => {
    const { quantity: _quantity, ...noQuantity } = orderRow.items[0]
    await withItems([noQuantity, orderRow.items[1]], async () => {
      await expect(splitOperations(container().scope).loadOrder("order_A")).rejects.toThrow("The quantity of item i1 was not loaded")
    })
  })
})

describe("reduceLines", () => {
  it("edits only the lines that change, through Medusa's edit: begin, quantities, request, confirm", async () => {
    decision.mockResolvedValue({ action: "pass", reason: "no_card_hold" })
    await splitOperations(container().scope).reduceLines("order_A", [{ item_id: "i1", quantity: 1 }, { item_id: "i2", quantity: 1 }], "Kovács Anna")
    expect(calls.map(([name]) => name)).toEqual(["begin", "quantities", "request", "confirm"])
    expect(calls[1][1]).toEqual({ order_id: "order_A", items: [{ id: "i1", quantity: 1 }] })
    expect(calls[3][1]).toEqual({ order_id: "order_A", confirmed_by: "Kovács Anna" })
  })
  it("lines already at their quantity make no edit at all", async () => {
    await splitOperations(container().scope).reduceLines("order_A", [{ item_id: "i1", quantity: 3 }], "u")
    expect(calls).toEqual([])
  })
  it("a refused edit stops before the confirm", async () => {
    decision.mockResolvedValue({ action: "refuse", message: "nem" })
    await expect(splitOperations(container().scope).reduceLines("order_A", [{ item_id: "i1", quantity: 1 }], "u")).rejects.toThrow("nem")
    // the open edit is canceled, or the next attempt would fail at its begin
    expect(calls.map(([name]) => name)).toEqual(["begin", "quantities", "request", "cancelEdit"])
  })
})

describe("notifySplit", () => {
  it("a notice that fails is logged with both orders named, and the split stands (no throw)", async () => {
    process.env = {
      ...process.env,
      ACROPORA_WEBSHOP_MAIL: "on",
      GMAIL_WEBSHOP_CLIENT_ID: "a",
      GMAIL_WEBSHOP_CLIENT_SECRET: "b",
      GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
    }
    const w = container()
    await expect(splitOperations(w.scope).notifySplit("order_A", "order_B", "card")).resolves.toBeUndefined()
    expect(w.errors).toEqual([expect.stringContaining("Orders order_A and order_B were split, but the customer's notice failed")])
  })
})

describe("createSplitOrder", () => {
  const moved: PlannedLine[] = [
    { from_item_id: "i1", variant_id: "var_i1", title: "Termék 1", quantity: 2, unit_price: 1000, metadata: null, location_id: "sloc_bolt" },
  ]

  it("makes B with A's prices, A's method and point at 0 Ft, A's addresses without their ids, and A's payment kind", async () => {
    const w = container({ var_i1: { manage_inventory: true, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] } })
    const ops = splitOperations(w.scope)
    const source = (await ops.loadOrder("order_A")) as SplitSource
    expect(await ops.createSplitOrder(source, moved, { acropora_split_from_order_id: "order_A" })).toEqual({ id: "order_B" })
    const [, input] = calls.find(([name]) => name === "createOrder")! as [string, Record<string, any>]
    expect(input.items).toEqual([
      {
        variant_id: "var_i1",
        title: "Termék 1",
        quantity: 2,
        unit_price: 1000,
        is_tax_inclusive: true,
        metadata: { acropora_split_from_item_id: "i1" },
      },
    ])
    expect(input.shipping_methods).toEqual([
      { name: "Foxpost csomagpont", shipping_option_id: "so_fox", amount: 0, data: { foxpost_pickup_point: { id: "P1" } } },
    ])
    expect(input.shipping_address).toEqual({ first_name: "Vevő", last_name: "Próba", city: "Budapest" })
    expect(input).toMatchObject({ region_id: "reg_hu", sales_channel_id: "sc_1", customer_id: "cus_1", email: "vevo@example.test" })
    expect(input.metadata).toEqual({ acropora_split_from_order_id: "order_A" })
    expect(w.reservationsMade).toEqual([
      { line_item_id: "ordli_B0", inventory_item_id: "iitem_1", location_id: "sloc_bolt", quantity: 2, allow_backorder: false },
    ])
    expect(calls.find(([name]) => name === "collection")![1]).toEqual({ order_id: "order_B", amount: 2000 })
    expect(calls.find(([name]) => name === "session")![1]).toEqual({ payment_collection_id: "paycol_B", provider_id: "pp_acropora_cod" })
    expect(w.authorized).toEqual(["payses_B"])
  })

  it("a card order's B gets no payment: it is born waiting for its own link", async () => {
    process.env = { ...process.env, ACROPORA_PP_ONLINE_CARD: "pp_stripe_stripe" }
    const w = container({ var_i1: { manage_inventory: false } })
    const ops = splitOperations(w.scope)
    const source = (await ops.loadOrder("order_A")) as SplitSource
    await ops.createSplitOrder({ ...source, payment_role: "ONLINE_CARD" } as SplitSource, moved, { acropora_split_from_order_id: "order_A" })
    const [, input] = calls.find(([name]) => name === "createOrder")! as [string, Record<string, any>]
    expect(input.metadata).toMatchObject({
      acropora_split_from_order_id: "order_A",
      acropora_payment: { state: "awaiting_payment", kind: "split" },
    })
    expect(calls.map(([name]) => name)).not.toContain("collection")
    expect(calls.map(([name]) => name)).not.toContain("session")
    expect(w.authorized).toEqual([])
  })

  it("B's reservation may go over the stock where A's did, or where the variant allows it (the test shop's #52)", async () => {
    const overStock = container({ var_i1: { manage_inventory: true, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] } })
    let ops = splitOperations(overStock.scope)
    await ops.createSplitOrder((await ops.loadOrder("order_A")) as SplitSource, [{ ...moved[0]!, allow_backorder: true }], {})
    expect(overStock.reservationsMade).toMatchObject([{ allow_backorder: true }])

    calls.length = 0
    const variantAllows = container({
      var_i1: { manage_inventory: true, allow_backorder: true, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] },
    })
    ops = splitOperations(variantAllows.scope)
    await ops.createSplitOrder((await ops.loadOrder("order_A")) as SplitSource, moved, {})
    expect(variantAllows.reservationsMade).toMatchObject([{ allow_backorder: true }])
  })

  it("a reservation refused after B exists cancels B, and the error goes on (no B left behind, as #53 was)", async () => {
    const w = container({ var_i1: { manage_inventory: true, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] } }, { reserveFails: true })
    const ops = splitOperations(w.scope)
    await expect(ops.createSplitOrder((await ops.loadOrder("order_A")) as SplitSource, moved, {})).rejects.toThrow("Not enough stock")
    expect(calls.map(([name]) => name)).toEqual(["createOrder", "cancelOrder"])
    expect(calls[1]![1]).toEqual({ order_id: "order_B" })
  })

  it("an unmanaged variant gets no reservation", async () => {
    const w = container({ var_i1: { manage_inventory: false, inventory_items: [{ inventory_item_id: "iitem_1" }] } })
    const ops = splitOperations(w.scope)
    await ops.createSplitOrder((await ops.loadOrder("order_A")) as SplitSource, moved, {})
    expect(w.reservationsMade).toEqual([])
  })
})

describe("stockProblem", () => {
  const line: PlannedLine = {
    from_item_id: "i1",
    variant_id: "var_i1",
    title: "Termék 1",
    quantity: 2,
    unit_price: 1000,
    metadata: null,
    location_id: "sloc_bolt",
  }
  const managed = { var_i1: { manage_inventory: true, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] } }
  const check = async (variants: Record<string, unknown>, stock: Parameters<typeof container>[1], moved = [line]) => {
    const ops = splitOperations(container(variants, stock).scope)
    return ops.stockProblem((await ops.loadOrder("order_A")) as SplitSource, moved)
  }

  it("what A holds for the line counts, because A's reduction releases it first", async () => {
    expect(await check(managed, { available: 0, held: 2 })).toBeNull()
  })

  it("no free stock and nothing held: refused before anything changes, the line named", async () => {
    expect(await check(managed, { available: 0, held: 0 })).toBe(
      "A(z) „Termék 1” tételből nincs elég szabad készlet az új rendeléshez, ezért a rendelés nem bontható szét. Semmi nem változott."
    )
  })

  it("a line A held over the stock, a variant that allows backorder, or an unmanaged one is never refused", async () => {
    expect(await check(managed, { available: 0, held: 0 }, [{ ...line, allow_backorder: true }])).toBeNull()
    expect(
      await check({ var_i1: { ...managed.var_i1, allow_backorder: true } }, { available: 0, held: 0 })
    ).toBeNull()
    expect(await check({ var_i1: { manage_inventory: false } }, { available: 0, held: 0 })).toBeNull()
  })
})
