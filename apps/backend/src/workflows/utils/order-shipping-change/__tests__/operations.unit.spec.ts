// the factory runs before this file's consts: the call log lives on globalThis
jest.mock("@medusajs/medusa/core-flows", () => {
  const log = ((globalThis as any).__shipCalls ??= []) as Array<[string, unknown]>
  const wf = (name: string) => () => ({
    run: async (args: { input: unknown }) => {
      log.push([name, args.input])
      return { result: {} }
    },
  })
  // the real module for everything else: the import chain composes other workflows at load time
  return {
    ...jest.requireActual("@medusajs/medusa/core-flows"),
    beginOrderEditOrderWorkflow: wf("begin"),
    createOrderEditShippingMethodWorkflow: wf("addMethod"),
    createOrderChangeActionsWorkflow: wf("actions"),
    requestOrderEditRequestWorkflow: wf("request"),
    confirmOrderEditRequestWorkflow: wf("confirm"),
    cancelBeginOrderEditWorkflow: wf("cancelEdit"),
  }
})
jest.mock("../../order-edit-hold", () => ({
  orderEditHoldDecision: (...args: unknown[]) => (globalThis as any).__shipDecision(...args),
  confirmKeepingHold: async (_id: string, _ops: unknown, confirm: () => Promise<unknown>) => ({ result: await confirm() }),
}))
jest.mock("../../order-edit-hold-operations", () => ({
  editHoldOperations: () => ({ closeOtherOpenCollections: async () => (globalThis as any).__shipCalls.push(["closeOther", null]) }),
}))

import { shippingChangeOperations } from "../operations"

const calls = ((globalThis as any).__shipCalls ??= []) as Array<[string, unknown]>
const decision = jest.fn()
;(globalThis as any).__shipDecision = decision

const container = () => {
  const methodUpdates: unknown[] = []
  return {
    methodUpdates,
    scope: {
      resolve: (key: string) => {
        if (key === "query")
          return {
            graph: async (q: { entity: string }) =>
              q.entity === "order_change"
                ? { data: [{ id: "ordch_1", actions: [{ action: "SHIPPING_ADD", reference_id: "sm_new" }] }] }
                : { data: [] },
          }
        if (key === "order") return { updateOrderShippingMethods: async (u: unknown) => methodUpdates.push(u) }
        throw new Error(`unexpected resolve ${key}`)
      },
    } as never,
  }
}

const option = { id: "so_fox", name: "Foxpost csomagpont", amount: 1290, carrier: "foxpost" as const, needs_point: true, heavy: false }

beforeEach(() => {
  calls.length = 0
  decision.mockReset()
})

describe("replaceMethod", () => {
  it("one edit: the new method at our price, its point data, the old one removed, then request and confirm", async () => {
    decision.mockResolvedValue({ action: "pass", reason: "no_card_hold" })
    const w = container()
    await shippingChangeOperations(w.scope).replaceMethod("order_1", {
      old_method_id: "sm_old",
      option,
      data: { foxpost_pickup_point: { id: "P9" } },
      tax_inclusive: true,
      actor: "Kovács Anna",
    })
    expect(calls.map(([name]) => name)).toEqual(["begin", "addMethod", "actions", "request", "confirm"])
    expect(calls[1][1]).toEqual({ order_id: "order_1", shipping_option_id: "so_fox", custom_amount: 1290 })
    expect(w.methodUpdates).toEqual([[{ id: "sm_new", is_tax_inclusive: true, data: { foxpost_pickup_point: { id: "P9" } } }]])
    expect(calls[2][1]).toEqual([
      {
        action: "SHIPPING_REMOVE",
        reference: "order_shipping_method",
        order_change_id: "ordch_1",
        reference_id: "sm_old",
        order_id: "order_1",
      },
    ])
  })

  it("a card hold is kept, and an old difference link closed", async () => {
    decision.mockResolvedValue({ action: "keep_hold", collectionId: "paycol_1", newTotal: 13000 })
    await shippingChangeOperations(container().scope).replaceMethod("order_1", { old_method_id: "sm_old", option, data: {}, tax_inclusive: true, actor: "u" })
    expect(calls.map(([name]) => name)).toEqual(["begin", "addMethod", "actions", "request", "confirm", "closeOther"])
  })

  it("a home method has no data to set, only the old method's tax mode", async () => {
    decision.mockResolvedValue({ action: "pass", reason: "no_card_hold" })
    const w = container()
    await shippingChangeOperations(w.scope).replaceMethod("order_1", {
      old_method_id: "sm_old",
      option: { ...option, id: "so_home", needs_point: false },
      data: {},
      tax_inclusive: true,
      actor: "u",
    })
    expect(w.methodUpdates).toEqual([[{ id: "sm_new", is_tax_inclusive: true }]])
  })

  it("the new method takes the old one's tax mode either way, never Medusa's default for a custom amount", async () => {
    decision.mockResolvedValue({ action: "pass", reason: "no_card_hold" })
    const w = container()
    await shippingChangeOperations(w.scope).replaceMethod("order_1", {
      old_method_id: "sm_old",
      option: { ...option, id: "so_home", needs_point: false },
      data: {},
      tax_inclusive: false,
      actor: "u",
    })
    expect(w.methodUpdates).toEqual([[{ id: "sm_new", is_tax_inclusive: false }]])
  })

  it("a refused rise cancels the open edit and throws the rules' message", async () => {
    decision.mockResolvedValue({ action: "refuse", message: "A közös zárolásnál nem lehet többet levonni." })
    await expect(
      shippingChangeOperations(container().scope).replaceMethod("order_1", { old_method_id: "sm_old", option, data: {}, tax_inclusive: true, actor: "u" })
    ).rejects.toThrow("A közös zárolásnál nem lehet többet levonni.")
    expect(calls.map(([name]) => name)).toEqual(["begin", "addMethod", "actions", "request", "cancelEdit"])
  })
})

describe("goodsTotal", () => {
  // Medusa as measured on the test shop (2026-10-06, order #52): the quantity
  // comes only when the item's detail is asked for too
  const medusaLike = (fields: string[]) => {
    const withDetail = fields.includes("items.detail.quantity")
    const line = (id: string, unit_price: number) => ({
      id,
      unit_price,
      is_tax_inclusive: true,
      metadata: null,
      ...(withDetail ? { quantity: 1, detail: { quantity: 1 } } : {}),
    })
    return { data: [{ items: [line("i1", 10500), line("i2", 4800)] }] }
  }
  const scope = {
    resolve: (key: string) => {
      if (key === "query") return { graph: async (q: { fields: string[] }) => medusaLike(q.fields) }
      throw new Error(`unexpected resolve ${key}`)
    },
  } as never

  it("reads the quantities with their detail, so the goods total is the real one, not 0", async () => {
    expect(await shippingChangeOperations(scope).goodsTotal("order_1")).toBe(15300)
  })
})
