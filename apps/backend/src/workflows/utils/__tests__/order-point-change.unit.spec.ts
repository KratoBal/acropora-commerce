const foxpostSearch = jest.fn()
const glsSearch = jest.fn()
jest.mock("../../../services/foxpost-pickup-points", () => ({
  FoxpostPickupPointsService: jest.fn().mockImplementation(() => ({ searchPickupPoints: (a: unknown) => foxpostSearch(a) })),
}))
jest.mock("../../../services/gls-pickup-points", () => ({
  GlsPickupPointsService: jest.fn().mockImplementation(() => ({ searchPickupPoints: (a: unknown) => glsSearch(a) })),
}))

import { MedusaError } from "@medusajs/framework/utils"

import { POST as pointRoute } from "../../../api/admin/order-shipping/[order_id]/point/route"
import { GET as pointsRoute } from "../../../api/admin/order-shipping/[order_id]/points/route"
import { AdminGetOrderPickupPointsParams, AdminPostOrderPickupPoint } from "../../../api/admin/order-shipping/validators"
import middlewares from "../../../api/middlewares"
import {
  type PointChangeOperations,
  type PointOrder,
  changeOrderPoint,
  pointChangeBlock,
  pointMethodOf,
} from "../order-point-change"
import { resolveShippingOptionRoleBindings } from "../shipping-option-roles"

const so = (env: string) => resolveShippingOptionRoleBindings().find((b) => b.env === env)!.id
const FOXPOST = so("ACROPORA_SO_FOXPOST")
const GLS_POINT = so("ACROPORA_SO_GLS_POINT")
const GLS_HEAVY_POINT = so("ACROPORA_SO_GLS_HEAVY_POINT")
const GLS_HOME = so("ACROPORA_SO_GLS_HOME")

const order = (optionId: string, extra: Partial<PointOrder> = {}, data: Record<string, unknown> = {}): PointOrder => ({
  id: "order_1",
  status: "pending",
  fulfillments: [],
  shipping_methods: [{ id: "sm_1", shipping_option_id: optionId, data, metadata: null }],
  ...extra,
})

const T = new Date("2026-10-05T21:10:00.000Z")

const fakeOps = (o: PointOrder | null, validate?: PointChangeOperations["validate"]) => {
  const updates: Array<{ id: string; changes: unknown }> = []
  const ops: PointChangeOperations & { validate: jest.Mock } = {
    loadOrder: async () => o,
    loadOption: async (id) => ({ provider_id: "acropora_acropora", data: { id } }),
    validate: jest.fn(
      validate ??
        (async (_p, _o, data) => {
          const [key, value] = Object.entries(data)[0] as [string, { id: string }]
          return { [key]: { id: value.id, name: `Pont ${value.id}` } }
        })
    ),
    updateMethod: async (id, changes) => {
      updates.push({ id, changes })
    },
    now: () => T,
  }
  return { ops, updates }
}

describe("pointMethodOf and pointChangeBlock", () => {
  it("finds the carrier and the heavy-goods rule from the order's own option", () => {
    expect(pointMethodOf(order(FOXPOST))).toMatchObject({ carrier: "foxpost", heavy: false })
    expect(pointMethodOf(order(GLS_POINT))).toMatchObject({ carrier: "gls", heavy: false })
    expect(pointMethodOf(order(GLS_HEAVY_POINT))).toMatchObject({ carrier: "gls", heavy: true })
    expect(pointMethodOf(order(GLS_HOME))).toBeNull()
  })

  it("blocks a home delivery, a canceled order and one with a live fulfillment", () => {
    expect(pointChangeBlock(order(GLS_HOME))).toBe("not_point")
    expect(pointChangeBlock(order(FOXPOST, { status: "canceled" }))).toBe("canceled")
    expect(pointChangeBlock(order(FOXPOST, { fulfillments: [{ id: "ful_1", canceled_at: null }] }))).toBe("fulfilled")
    expect(pointChangeBlock(order(FOXPOST, { fulfillments: [{ id: "ful_1", canceled_at: T }] }))).toBeNull()
  })
})

describe("changeOrderPoint", () => {
  it("validates the id with the provider as the checkout does, stores the provider's record, and keeps a history", async () => {
    const o = order(GLS_POINT, {}, { gls_pickup_point: { id: "OLD", name: "Régi" }, other: 1 })
    o.shipping_methods![0]!.metadata = { acropora_point_history: [{ from: null, to: "OLD" }], kept: true }
    const { ops, updates } = fakeOps(o)
    const result = await changeOrderPoint("order_1", { point_id: "NEW", actor: "Kovács Anna" }, "user_key", ops)
    expect(ops.validate).toHaveBeenCalledWith(
      "acropora_acropora",
      { id: GLS_POINT },
      { gls_pickup_point: { id: "NEW", source: "fallback" } }
    )
    expect(result).toEqual({
      status: "done",
      carrier: "gls",
      changed: true,
      previous_point_id: "OLD",
      point: { id: "NEW", name: "Pont NEW" },
    })
    expect(updates).toEqual([
      {
        id: "sm_1",
        changes: {
          data: { gls_pickup_point: { id: "NEW", name: "Pont NEW" }, other: 1 },
          metadata: {
            kept: true,
            acropora_point_history: [
              { from: null, to: "OLD" },
              { from: "OLD", to: "NEW", at: T.toISOString(), by: "Kovács Anna", api_actor: "user_key" },
            ],
          },
        },
      },
    ])
  })

  it("Foxpost sends only the id; without a name the key's actor is the author", async () => {
    const { ops, updates } = fakeOps(order(FOXPOST, {}, { foxpost_pickup_point: { id: "A" } }))
    await changeOrderPoint("order_1", { point_id: "B" }, "user_key", ops)
    expect(ops.validate.mock.calls[0][2]).toEqual({ foxpost_pickup_point: { id: "B" } })
    expect((updates[0].changes as { metadata: { acropora_point_history: Array<{ by: string }> } }).metadata.acropora_point_history[0].by).toBe(
      "user_key"
    )
  })

  it("the same point writes nothing", async () => {
    const { ops, updates } = fakeOps(order(FOXPOST, {}, { foxpost_pickup_point: { id: "A", name: "Régi" } }))
    expect(await changeOrderPoint("order_1", { point_id: "A" }, "u", ops)).toMatchObject({ status: "done", changed: false })
    expect(ops.validate).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it("a point the provider refuses is invalid, an unavailable list is unavailable, both without a write", async () => {
    const refused = fakeOps(order(FOXPOST), async () => {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The selected Foxpost pickup point is unavailable")
    })
    expect(await changeOrderPoint("order_1", { point_id: "X" }, "u", refused.ops)).toEqual({ status: "invalid_point" })
    const down = fakeOps(order(FOXPOST), async () => {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Foxpost shipping is currently unavailable")
    })
    expect(await changeOrderPoint("order_1", { point_id: "X" }, "u", down.ops)).toEqual({ status: "unavailable" })
    expect([...refused.updates, ...down.updates]).toEqual([])
    const broken = fakeOps(order(FOXPOST), async () => {
      throw new Error("db down")
    })
    await expect(changeOrderPoint("order_1", { point_id: "X" }, "u", broken.ops)).rejects.toThrow("db down")
  })

  it("a blocked order is not validated or written", async () => {
    const { ops, updates } = fakeOps(order(FOXPOST, { fulfillments: [{ id: "f" }] }))
    expect(await changeOrderPoint("order_1", { point_id: "B" }, "u", ops)).toEqual({ status: "blocked", reason: "fulfilled" })
    expect(ops.validate).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })
})

describe("the routes", () => {
  const scope = (o: PointOrder | null, validate?: () => Promise<Record<string, unknown>>) => {
    const updated: unknown[] = []
    return {
      updated,
      scope: {
        resolve: (key: string) => {
          if (key === "query")
            return {
              graph: async (q: { entity: string; filters: { id: string } }) =>
                q.entity === "order"
                  ? { data: o ? [o] : [] }
                  : { data: [{ id: q.filters.id, provider_id: "acropora_acropora", data: { id: q.filters.id } }] },
            }
          if (key === "fulfillment")
            return { validateFulfillmentData: validate ?? (async () => ({ foxpost_pickup_point: { id: "B", name: "Új" } })) }
          if (key === "order") return { updateOrderShippingMethods: async (c: unknown) => updated.push(c) }
          throw new Error(`unexpected resolve ${key}`)
        },
      } as never,
    }
  }
  const call = async (route: typeof pointRoute | typeof pointsRoute, req: Record<string, unknown>) => {
    const res = { statusCode: 200, body: undefined as unknown, status: jest.fn(), json: jest.fn() }
    res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
    res.json.mockImplementation((body: unknown) => (res.body = body))
    await route(req as never, res as never)
    return res
  }
  const post = (s: unknown, body: Record<string, unknown> = { point_id: "B" }) =>
    call(pointRoute, { scope: s, params: { order_id: "order_1" }, validatedBody: body, auth_context: { actor_id: "user_key" } })

  it("POST answers 200 with the stored point and writes through the order module", async () => {
    const w = scope(order(FOXPOST, {}, { foxpost_pickup_point: { id: "A" } }))
    expect(await post(w.scope)).toMatchObject({
      statusCode: 200,
      body: { carrier: "foxpost", changed: true, previous_point_id: "A", point: { id: "B", name: "Új" } },
    })
    expect(w.updated).toEqual([expect.objectContaining({ id: "sm_1", data: { foxpost_pickup_point: { id: "B", name: "Új" } } })])
  })

  it("POST answers 404, 409, 422 and 503 in Hungarian", async () => {
    expect(await post(scope(null).scope)).toMatchObject({ statusCode: 404, body: { message: "Nincs ilyen rendelés." } })
    expect(await post(scope(order(GLS_HOME)).scope)).toMatchObject({
      statusCode: 409,
      body: { message: "Ez a rendelés nem csomagpontra megy, itt nincs csomagpont, amit cserélni lehetne." },
    })
    const refused = scope(order(FOXPOST), async () => {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "x")
    })
    expect(await post(refused.scope)).toMatchObject({
      statusCode: 422,
      body: { message: "Ez a csomagpont ehhez a szállítási módhoz most nem választható." },
    })
    const down = scope(order(FOXPOST), async () => {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "x")
    })
    expect(await post(down.scope)).toMatchObject({ statusCode: 503 })
  })

  it("GET searches the order's own carrier, with the heavy-goods rule, and names the current point", async () => {
    glsSearch.mockResolvedValue({ available: true, pickup_points: [{ id: "S1" }], total: 1 })
    const w = scope(order(GLS_HEAVY_POINT, {}, { gls_pickup_point: { id: "OLD" } }))
    const res = await call(pointsRoute, { scope: w.scope, params: { order_id: "order_1" }, validatedQuery: { q: "2100", limit: 20 } })
    expect(glsSearch).toHaveBeenCalledWith({ query: "2100", heavy: true, limit: 20 })
    expect(foxpostSearch).not.toHaveBeenCalled()
    expect(res).toMatchObject({
      statusCode: 200,
      body: { carrier: "gls", current_point_id: "OLD", available: true, pickup_points: [{ id: "S1" }], total: 1 },
    })
  })

  it("GET is 503 while the list is down, and 409 for a blocked order", async () => {
    foxpostSearch.mockResolvedValue({ available: false, reason: "unreachable" })
    const down = await call(pointsRoute, { scope: scope(order(FOXPOST)).scope, params: { order_id: "order_1" }, validatedQuery: { q: "x", limit: 5 } })
    expect(down).toMatchObject({ statusCode: 503, body: { carrier: "foxpost", available: false } })
    const blocked = await call(pointsRoute, {
      scope: scope(order(FOXPOST, { status: "canceled" })).scope,
      params: { order_id: "order_1" },
      validatedQuery: { q: "x", limit: 5 },
    })
    expect(blocked).toMatchObject({ statusCode: 409, body: { message: "A rendelés törölve van, a csomagpontja nem módosítható." } })
  })

  it("both are validated: an id only (no point details), an optional name, a bounded search", () => {
    expect(AdminPostOrderPickupPoint.safeParse({ point_id: "B", source: "finder", actor: "Kovács Anna" }).success).toBe(true)
    expect(AdminPostOrderPickupPoint.safeParse({ point_id: "B", name: "hamis" }).success).toBe(false)
    expect(AdminPostOrderPickupPoint.safeParse({ point_id: " " }).success).toBe(false)
    expect(AdminGetOrderPickupPointsParams.safeParse({ q: "" }).success).toBe(false)
    expect(AdminGetOrderPickupPointsParams.safeParse({ q: "x", limit: "51" }).success).toBe(false)
    for (const matcher of ["/admin/order-shipping/:order_id/points", "/admin/order-shipping/:order_id/point"]) {
      expect((middlewares.routes ?? []).find((r) => r.matcher === matcher)?.middlewares).toHaveLength(1)
    }
  })
})
