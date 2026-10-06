import { resolveShippingOptionRoleBindings } from "../../shipping-option-roles"
import { type ChangeOperations, type ChangeOrder, changeBlock, changeShippingMethod, listChangeOptions } from "../change"
import { courierOptions } from "../options"

const so = (env: string) => resolveShippingOptionRoleBindings().find((b) => b.env === env)!.id
const PICKUP = so("ACROPORA_SO_PICKUP")
const GLS_HOME = so("ACROPORA_SO_GLS_HOME")
const GLS_POINT = so("ACROPORA_SO_GLS_POINT")
const GLS_HEAVY_HOME = so("ACROPORA_SO_GLS_HEAVY_HOME")
const GLS_HEAVY_POINT = so("ACROPORA_SO_GLS_HEAVY_POINT")
const FOXPOST = so("ACROPORA_SO_FOXPOST")

const settings = { shipping_gls_normal_huf: 1990, shipping_gls_heavy_huf: 4990, shipping_foxpost_huf: 1290, free_shipping_threshold_huf: 30000 }
const names = {
  [PICKUP]: "Bolti átvétel",
  [GLS_HOME]: "GLS házhozszállítás",
  [GLS_POINT]: "GLS csomagpont",
  [GLS_HEAVY_HOME]: "GLS nehézáru házhozszállítás",
  [GLS_HEAVY_POINT]: "GLS nehézáru csomagpont",
  [FOXPOST]: "Foxpost csomagpont",
}

describe("courierOptions", () => {
  const ids = (o: { id: string }[]) => o.map((x) => x.id)

  it("offers the checkout's courier methods for the class, never in-store pickup", () => {
    const normal = courierOptions({ shippingClass: "NORMAL", paymentRole: "ONLINE_CARD", goodsTotalHuf: 10000, settings, names })
    expect(ids(normal)).toEqual([GLS_HOME, GLS_POINT, FOXPOST])
    expect(ids(courierOptions({ shippingClass: "HEAVY", paymentRole: "COD", goodsTotalHuf: 10000, settings, names }))).toEqual([
      GLS_HEAVY_HOME,
      GLS_HEAVY_POINT,
    ])
    expect(ids(courierOptions({ shippingClass: "NO_FOXPOST", paymentRole: "COD", goodsTotalHuf: 1, settings, names }))).toEqual([
      GLS_HOME,
      GLS_POINT,
    ])
    expect(courierOptions({ shippingClass: "PICKUP_ONLY", paymentRole: "COD", goodsTotalHuf: 1, settings, names })).toEqual([])
    // pay at the shop is no courier's payment
    expect(courierOptions({ shippingClass: "NORMAL", paymentRole: "PAY_AT_STORE", goodsTotalHuf: 1, settings, names })).toEqual([])
  })

  it("prices each with the checkout's calculator, the free threshold included, and says what it needs", () => {
    const below = courierOptions({ shippingClass: "NORMAL", paymentRole: "COD", goodsTotalHuf: 10000, settings, names })
    expect(below).toEqual([
      { id: GLS_HOME, name: "GLS házhozszállítás", amount: 1990, carrier: "gls", needs_point: false, heavy: false },
      { id: GLS_POINT, name: "GLS csomagpont", amount: 1990, carrier: "gls", needs_point: true, heavy: false },
      { id: FOXPOST, name: "Foxpost csomagpont", amount: 1290, carrier: "foxpost", needs_point: true, heavy: false },
    ])
    expect(courierOptions({ shippingClass: "NORMAL", paymentRole: "COD", goodsTotalHuf: 30000, settings, names }).map((o) => o.amount)).toEqual([
      0, 0, 0,
    ])
    const heavy = courierOptions({ shippingClass: "HEAVY", paymentRole: "COD", goodsTotalHuf: 50000, settings, names })
    expect(heavy.map((o) => [o.amount, o.heavy, o.needs_point])).toEqual([
      [4990, true, false],
      [4990, true, true],
    ])
  })

  it("an option the shop has no name for is not offered", () => {
    const { [FOXPOST]: _gone, ...without } = names
    expect(ids(courierOptions({ shippingClass: "NORMAL", paymentRole: "COD", goodsTotalHuf: 1, settings, names: without }))).not.toContain(FOXPOST)
  })
})

const order = (extra: Partial<ChangeOrder> = {}): ChangeOrder => ({
  id: "order_1",
  status: "pending",
  business_status: "confirmed",
  fulfillments: [],
  metadata: { egyeb: 1 },
  total: 11990,
  payment_role: "COD",
  paid: false,
  method: { id: "sm_1", shipping_option_id: GLS_HOME, amount: 1990, data: {}, is_tax_inclusive: true },
  ...extra,
})

const fakeOps = (start: ChangeOrder, opts: { payment?: { state: string; difference_due: boolean } } = {}) => {
  let current = start
  const replaced: unknown[] = []
  const ops: ChangeOperations & { validatePoint: jest.Mock } = {
    loadOrder: async () => JSON.parse(JSON.stringify(current)),
    shippingClass: async () => "NORMAL",
    goodsTotal: async () => 10000,
    settings: async () => settings,
    optionNames: async () => names,
    validatePoint: jest.fn(async (_o, carrier, pointId) => ({
      ok: true as const,
      data: { [carrier === "gls" ? "gls_pickup_point" : "foxpost_pickup_point"]: { id: pointId, name: "Pont" } },
    })),
    replaceMethod: async (_id, change) => {
      replaced.push(change)
      current = {
        ...current,
        total: current.total - current.method!.amount + change.option.amount,
        method: { id: "sm_2", shipping_option_id: change.option.id, amount: change.option.amount, data: change.data, is_tax_inclusive: change.tax_inclusive },
      }
    },
    payment: async () => opts.payment ?? { state: "none", difference_due: false },
    setMetadata: async (_id, metadata) => {
      current = { ...current, metadata }
    },
    now: () => new Date("2026-10-06T08:00:00.000Z"),
  }
  return { ops, replaced, current: () => current }
}

describe("changeBlock", () => {
  it("only before Kiszállítás, on an unpaid courier order", () => {
    expect(changeBlock(order())).toBeNull()
    expect(changeBlock(order({ status: "canceled" }))).toBe("canceled")
    expect(changeBlock(order({ fulfillments: [{ id: "f", canceled_at: null }] }))).toBe("fulfilled")
    expect(changeBlock(order({ business_status: "out_for_delivery" }))).toBe("status")
    expect(changeBlock(order({ paid: true }))).toBe("paid")
    expect(changeBlock(order({ method: { id: "sm", shipping_option_id: PICKUP, amount: 0, data: {}, is_tax_inclusive: true } }))).toBe("not_courier")
    expect(changeBlock(order({ method: null }))).toBe("not_courier")
  })
})

describe("listChangeOptions", () => {
  it("names the current method and prices the order's options", async () => {
    const w = fakeOps(order())
    expect(await listChangeOptions("order_1", w.ops)).toMatchObject({
      status: "ok",
      current_option_id: GLS_HOME,
      options: [{ id: GLS_HOME }, { id: GLS_POINT }, { id: FOXPOST, amount: 1290 }],
    })
  })
})

describe("changeShippingMethod", () => {
  it("the new method is told the old one's tax mode (a net-priced old method stays net)", async () => {
    const w = fakeOps(order({ method: { id: "sm_1", shipping_option_id: GLS_HOME, amount: 1990, data: {}, is_tax_inclusive: false } }))
    await changeShippingMethod("order_1", { shipping_option_id: FOXPOST, point_id: "P9" }, "user_key", w.ops)
    expect(w.replaced.map((change) => change.tax_inclusive)).toEqual([false])
  })

  it("home to Foxpost: the point is checked, the method replaced in one step, the difference and history recorded", async () => {
    const w = fakeOps(order())
    const result = await changeShippingMethod(
      "order_1",
      { shipping_option_id: FOXPOST, point_id: "P9", actor: "Kovács Anna" },
      "user_key",
      w.ops
    )
    expect(w.ops.validatePoint).toHaveBeenCalledWith(FOXPOST, "foxpost", "P9", "fallback")
    expect(w.replaced).toEqual([
      {
        old_method_id: "sm_1",
        option: { id: FOXPOST, name: "Foxpost csomagpont", amount: 1290, carrier: "foxpost", needs_point: true, heavy: false },
        data: { foxpost_pickup_point: { id: "P9", name: "Pont" } },
        tax_inclusive: true,
        actor: "Kovács Anna",
      },
    ])
    expect(result).toEqual({
      status: "done",
      changed: true,
      previous_total: 11990,
      total: 11290,
      difference: -700,
      payment_due: false,
      payment_state: "none",
    })
    expect(w.current().metadata).toEqual({
      egyeb: 1,
      acropora_shipping_history: [
        {
          from: { option_id: GLS_HOME, point_id: null, amount: 1990 },
          to: { option_id: FOXPOST, point_id: "P9", amount: 1290 },
          at: "2026-10-06T08:00:00.000Z",
          by: "Kovács Anna",
          api_actor: "user_key",
        },
      ],
    })
  })

  it("a rise over a card hold says the difference is due", async () => {
    const w = fakeOps(order({ payment_role: "ONLINE_CARD", method: { id: "sm_1", shipping_option_id: FOXPOST, amount: 1290, data: {}, is_tax_inclusive: true } }), {
      payment: { state: "awaiting_payment", difference_due: true },
    })
    expect(await changeShippingMethod("order_1", { shipping_option_id: GLS_HOME }, "u", w.ops)).toMatchObject({
      changed: true,
      difference: 700,
      payment_due: true,
      payment_state: "awaiting_payment",
    })
  })

  it("the same method and point changes nothing", async () => {
    const w = fakeOps(order({ method: { id: "sm_1", shipping_option_id: FOXPOST, amount: 1290, data: { foxpost_pickup_point: { id: "P9" } }, is_tax_inclusive: true } }))
    expect(await changeShippingMethod("order_1", { shipping_option_id: FOXPOST, point_id: "P9" }, "u", w.ops)).toMatchObject({
      changed: false,
      difference: 0,
    })
    expect(w.replaced).toEqual([])
    expect(w.ops.validatePoint).not.toHaveBeenCalled()
  })

  it("a method not offered, a missing point, a refused point and a list that is down write nothing", async () => {
    const w = fakeOps(order())
    expect(await changeShippingMethod("order_1", { shipping_option_id: GLS_HEAVY_HOME }, "u", w.ops)).toEqual({
      status: "invalid",
      message: "Ez a szállítási mód ehhez a rendeléshez nem választható.",
    })
    expect(await changeShippingMethod("order_1", { shipping_option_id: GLS_POINT }, "u", w.ops)).toEqual({
      status: "invalid",
      message: "Csomagpontos módhoz csomagpontot is ki kell választani.",
    })
    w.ops.validatePoint.mockResolvedValueOnce({ ok: false, reason: "invalid_point" })
    expect((await changeShippingMethod("order_1", { shipping_option_id: GLS_POINT, point_id: "X" }, "u", w.ops)).status).toBe("invalid")
    w.ops.validatePoint.mockResolvedValueOnce({ ok: false, reason: "unavailable" })
    expect(await changeShippingMethod("order_1", { shipping_option_id: GLS_POINT, point_id: "X" }, "u", w.ops)).toEqual({ status: "unavailable" })
    expect(w.replaced).toEqual([])
  })

  it("a blocked order is not changed", async () => {
    const w = fakeOps(order({ paid: true }))
    expect(await changeShippingMethod("order_1", { shipping_option_id: FOXPOST, point_id: "P" }, "u", w.ops)).toEqual({
      status: "blocked",
      reason: "paid",
    })
    expect(w.replaced).toEqual([])
  })
})
