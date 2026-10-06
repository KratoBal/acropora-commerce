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
    { id: "i1", variant_id: "var_i1", title: "Termék 1", quantity: 3, total: 3000, discount_total: 0, is_tax_inclusive: true, metadata: null },
    { id: "i2", variant_id: "var_i2", title: "Termék 2", quantity: 1, total: 5000, discount_total: 0, is_tax_inclusive: true, metadata: null },
  ],
  shipping_methods: [{ name: "Foxpost csomagpont", shipping_option_id: "so_fox", data: { foxpost_pickup_point: { id: "P1" } } }],
  fulfillments: [],
  payment_collections: [{ payments: [{ provider_id: "pp_acropora_cod", captured_at: null, canceled_at: null }], payment_sessions: [] }],
}

const container = (variants: Record<string, unknown> = {}) => {
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
            graph: async (q: { entity: string; filters: { id: string } }) => {
              if (q.entity === "order") return { data: q.filters.id === "order_A" ? [JSON.parse(JSON.stringify(orderRow))] : [{ display_id: 202, total: 2000 }] }
              if (q.entity === "product_variant") return { data: [variants[q.filters.id]] }
              return { data: [] }
            },
          }
        if (key === "order_business_status") return { listOrderBusinessStatusModels: async () => [{ status: "stocking" }] }
        if (key === "inventory")
          return {
            listReservationItems: async () => [{ line_item_id: "i1", location_id: "sloc_bolt" }],
            createReservationItems: async (r: unknown[]) => reservationsMade.push(...r),
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
    expect(w.reservationsMade).toEqual([{ line_item_id: "ordli_B0", inventory_item_id: "iitem_1", location_id: "sloc_bolt", quantity: 2 }])
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

  it("an unmanaged variant gets no reservation", async () => {
    const w = container({ var_i1: { manage_inventory: false, inventory_items: [{ inventory_item_id: "iitem_1" }] } })
    const ops = splitOperations(w.scope)
    await ops.createSplitOrder((await ops.loadOrder("order_A")) as SplitSource, moved, {})
    expect(w.reservationsMade).toEqual([])
  })
})
