jest.mock("../../../../../../workflows/utils/order-shipping-change/change", () => ({
  ...jest.requireActual("../../../../../../workflows/utils/order-shipping-change/change"),
  changeShippingMethod: (...args: unknown[]) => (globalThis as any).__change(...args),
  listChangeOptions: (...args: unknown[]) => (globalThis as any).__list(...args),
}))
jest.mock("../../../../../../workflows/utils/order-shipping-change/operations", () => ({ shippingChangeOperations: () => ({}) }))
jest.mock("../../../../../../services/foxpost-pickup-points", () => ({
  FoxpostPickupPointsService: jest.fn().mockImplementation(() => ({ searchPickupPoints: (a: unknown) => (globalThis as any).__fox(a) })),
}))
jest.mock("../../../../../../services/gls-pickup-points", () => ({
  GlsPickupPointsService: jest.fn().mockImplementation(() => ({ searchPickupPoints: (a: unknown) => (globalThis as any).__gls(a) })),
}))

import { MedusaError } from "@medusajs/framework/utils"

import middlewares from "../../../../../middlewares"
import { AdminGetOrderPickupPointsParams, AdminPostOrderShippingMethod } from "../../../validators"
import { GET as optionsRoute } from "../../options/route"
import { GET as pointsRoute } from "../../points/route"
import { POST as methodRoute } from "../route"

const change = jest.fn()
const list = jest.fn()
const fox = jest.fn()
const gls = jest.fn()
Object.assign(globalThis as any, { __change: change, __list: list, __fox: fox, __gls: gls })

const call = async (route: (req: never, res: never) => Promise<void>, req: Record<string, unknown>) => {
  const res = { statusCode: 200, body: undefined as unknown, status: jest.fn(), json: jest.fn() }
  res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
  res.json.mockImplementation((body: unknown) => (res.body = body))
  await route({ scope: {}, params: { order_id: "order_1" }, auth_context: { actor_id: "user_key" }, ...req } as never, res as never)
  return res
}

beforeEach(() => [change, list, fox, gls].forEach((m) => m.mockReset()))

describe("POST /admin/order-shipping/:order_id/method", () => {
  const post = () => call(methodRoute, { validatedBody: { shipping_option_id: "so_fox", point_id: "P9", actor: "Kovács Anna" } })

  it("answers the change, and passes the key's actor", async () => {
    change.mockResolvedValue({ status: "done", changed: true, previous_total: 11990, total: 11290, difference: -700, payment_due: false, payment_state: "none" })
    expect(await post()).toMatchObject({
      statusCode: 200,
      body: { changed: true, previous_total: 11990, total: 11290, difference: -700, payment_due: false, payment_state: "none" },
    })
    expect(change.mock.calls[0].slice(0, 3)).toEqual(["order_1", { shipping_option_id: "so_fox", point_id: "P9", actor: "Kovács Anna" }, "user_key"])
  })

  it("404, 409 (blocked, and the hold rules' refusal), 422, 503 in Hungarian", async () => {
    change.mockResolvedValue({ status: "not_found" })
    expect(await post()).toMatchObject({ statusCode: 404 })
    change.mockResolvedValue({ status: "blocked", reason: "paid" })
    expect(await post()).toMatchObject({
      statusCode: 409,
      body: { message: "A rendelés már ki van fizetve; kifizetett rendelés szállítási módja most nem cserélhető." },
    })
    change.mockRejectedValue(new MedusaError(MedusaError.Types.NOT_ALLOWED, "A közös zárolásnál nem lehet többet levonni."))
    expect(await post()).toMatchObject({ statusCode: 409, body: { message: "A közös zárolásnál nem lehet többet levonni." } })
    change.mockResolvedValue({ status: "invalid", message: "Csomagpontos módhoz csomagpontot is ki kell választani." })
    expect(await post()).toMatchObject({ statusCode: 422 })
    change.mockResolvedValue({ status: "unavailable" })
    expect(await post()).toMatchObject({ statusCode: 503 })
    change.mockRejectedValue(new Error("db down"))
    await expect(post()).rejects.toThrow("db down")
  })
})

describe("GET /admin/order-shipping/:order_id/options", () => {
  it("answers the list, or 404 / 409", async () => {
    list.mockResolvedValue({ status: "ok", current_option_id: "so_home", options: [{ id: "so_fox" }] })
    expect(await call(optionsRoute, {})).toMatchObject({ statusCode: 200, body: { current_option_id: "so_home", options: [{ id: "so_fox" }] } })
    list.mockResolvedValue({ status: "blocked", reason: "status" })
    expect(await call(optionsRoute, {})).toMatchObject({ statusCode: 409 })
  })
})

describe("GET /admin/order-shipping/:order_id/points?option_id= (nautilus 26644)", () => {
  const options = [
    { id: "so_home", carrier: "gls", needs_point: false, heavy: false },
    { id: "so_gls_heavy_point", carrier: "gls", needs_point: true, heavy: true },
    { id: "so_fox", carrier: "foxpost", needs_point: true, heavy: false },
  ]

  it("lists the TARGET method's points, by its carrier and heavy-goods rule", async () => {
    list.mockResolvedValue({ status: "ok", current_option_id: "so_home", options })
    gls.mockResolvedValue({ available: true, pickup_points: [{ id: "S1" }], total: 1 })
    const res = await call(pointsRoute, { validatedQuery: { q: "2100", limit: 20, option_id: "so_gls_heavy_point" } })
    expect(gls).toHaveBeenCalledWith({ query: "2100", heavy: true, limit: 20 })
    expect(fox).not.toHaveBeenCalled()
    expect(res).toMatchObject({ statusCode: 200, body: { carrier: "gls", current_point_id: null, pickup_points: [{ id: "S1" }] } })
  })

  it("a home method or one the order may not take is 422; a blocked order 409", async () => {
    list.mockResolvedValue({ status: "ok", current_option_id: "so_home", options })
    expect(await call(pointsRoute, { validatedQuery: { q: "x", limit: 5, option_id: "so_home" } })).toMatchObject({ statusCode: 422 })
    expect(await call(pointsRoute, { validatedQuery: { q: "x", limit: 5, option_id: "so_other" } })).toMatchObject({ statusCode: 422 })
    list.mockResolvedValue({ status: "blocked", reason: "fulfilled" })
    expect(await call(pointsRoute, { validatedQuery: { q: "x", limit: 5, option_id: "so_fox" } })).toMatchObject({ statusCode: 409 })
  })

  it("the bodies, and the method route is validated", () => {
    expect(AdminGetOrderPickupPointsParams.safeParse({ q: "x", option_id: "so_fox" }).success).toBe(true)
    expect(AdminPostOrderShippingMethod.safeParse({ shipping_option_id: "so_fox", point_id: "P", source: "finder", actor: "A" }).success).toBe(true)
    expect(AdminPostOrderShippingMethod.safeParse({ shipping_option_id: "so_fox", amount: 0 }).success).toBe(false)
    expect((middlewares.routes ?? []).find((r) => r.matcher === "/admin/order-shipping/:order_id/method")?.middlewares).toHaveLength(1)
  })
})
