jest.mock("../../../../../workflows/utils/order-split/split", () => ({
  splitOrder: (...args: unknown[]) => (globalThis as any).__splitOrder(...args),
}))
jest.mock("../../../../../workflows/utils/order-split/operations", () => ({ splitOperations: () => ({}) }))

import middlewares from "../../../../middlewares"
import { AdminPostOrderSplit } from "../../validators"
import { POST } from "../route"

const splitOrder = jest.fn()
;(globalThis as any).__splitOrder = splitOrder

const call = async () => {
  const res = { statusCode: 200, body: undefined as unknown, status: jest.fn(), json: jest.fn() }
  res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
  res.json.mockImplementation((body: unknown) => (res.body = body))
  await POST(
    {
      scope: {},
      params: { order_id: "order_A" },
      validatedBody: { lines: [{ item_id: "i1", quantity: 1 }], request_id: "r1", actor: "Kovács Anna" },
      auth_context: { actor_id: "user_key" },
    } as never,
    res as never
  )
  return res
}

describe("POST /admin/order-split/:order_id", () => {
  it("passes the body and the key's actor, and answers the new order without the status field", async () => {
    splitOrder.mockResolvedValue({
      status: "done",
      order_id: "order_B",
      display_id: 202,
      parent_order_id: "order_A",
      parent_total: 6000,
      total: 2000,
      payment_state: "none",
    })
    expect(await call()).toMatchObject({
      statusCode: 200,
      body: { order_id: "order_B", display_id: 202, parent_order_id: "order_A", parent_total: 6000, total: 2000, payment_state: "none" },
    })
    expect(splitOrder.mock.calls[0].slice(0, 3)).toEqual([
      "order_A",
      { lines: [{ item_id: "i1", quantity: 1 }], request_id: "r1", actor: "Kovács Anna" },
      "user_key",
    ])
  })

  it("404, 409 (blocked, a card without its hold, an unknown payment) and 422 in Hungarian", async () => {
    splitOrder.mockResolvedValue({ status: "not_found" })
    expect(await call()).toMatchObject({ statusCode: 404, body: { message: "Nincs ilyen rendelés." } })
    splitOrder.mockResolvedValue({ status: "blocked", reason: "paid" })
    expect(await call()).toMatchObject({
      statusCode: 409,
      body: { message: "A rendelés már ki van fizetve; kifizetett rendelés szétbontása most nem lehetséges." },
    })
    splitOrder.mockResolvedValue({ status: "blocked", reason: "card_not_held" })
    expect(await call()).toMatchObject({
      statusCode: 409,
      body: {
        message:
          "A kártyás rendelés most nem bontható szét: a zárolása már nem áll (feloldották vagy levonták). Előbb rendezd a fizetését.",
      },
    })
    splitOrder.mockResolvedValue({ status: "blocked", reason: "unknown_payment" })
    expect(await call()).toMatchObject({ statusCode: 409, body: { message: "A rendelés fizetési módja nem ismert, ezért nem bontható szét." } })
    splitOrder.mockResolvedValue({ status: "invalid", message: "Jelölj ki legalább egy tételt." })
    expect(await call()).toMatchObject({ statusCode: 422, body: { message: "Jelölj ki legalább egy tételt." } })
  })

  it("the body: lines with whole quantities, a request id, an optional name, nothing else; the route is validated", () => {
    expect(AdminPostOrderSplit.safeParse({ lines: [{ item_id: "i1", quantity: 2 }], request_id: "r1" }).success).toBe(true)
    expect(AdminPostOrderSplit.safeParse({ lines: [{ item_id: "i1", quantity: 2 }] }).success).toBe(false)
    expect(AdminPostOrderSplit.safeParse({ lines: [], request_id: "r1" }).success).toBe(false)
    expect(AdminPostOrderSplit.safeParse({ lines: [{ item_id: "i1", quantity: 1.5 }], request_id: "r1" }).success).toBe(false)
    expect(AdminPostOrderSplit.safeParse({ lines: [{ item_id: "i1", quantity: 1, price: 1 }], request_id: "r1" }).success).toBe(false)
    expect((middlewares.routes ?? []).find((r) => r.matcher === "/admin/order-split/:order_id")?.middlewares).toHaveLength(1)
  })
})
