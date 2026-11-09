import { storeCustomerRoutesMiddlewares } from "@medusajs/medusa/api/store/customers/middlewares"

const ownOrder = jest.fn()
const storePickupOf = jest.fn()
const createWithdrawal = jest.fn()
const notifyWithdrawalReceived = jest.fn()
const guestWithdrawalsOf = jest.fn()
jest.mock("../../../../../../../../workflows/utils/webshop-mail/withdrawal-received-mail", () => ({
  notifyWithdrawalReceived: (...args: unknown[]) => notifyWithdrawalReceived(...args),
}))
jest.mock("../../../../../../../../workflows/utils/guest-order/operations", () => ({
  guestWithdrawalsOf: (...args: unknown[]) => guestWithdrawalsOf(...args),
}))
jest.mock("../../../../../../../../workflows/utils/withdrawal/withdrawal", () => ({
  ownOrder: (...args: unknown[]) => ownOrder(...args),
  storePickupOf: (...args: unknown[]) => storePickupOf(...args),
  createWithdrawal: (...args: unknown[]) => createWithdrawal(...args),
}))

import middlewares from "../../../../../../../middlewares"
import { GET, POST } from "../route"
import { StorePostCustomerWithdrawal } from "../validators"

/*
  WHAT TURNS THIS RED (V0.3, the signed-in customer's declaration). The order looked up with an id from the REQUEST
  instead of the session's (another customer's order would open); a miss answered with anything but the one 404; no
  session served instead of refused; the answer differing from the guest route's (the page reads one contract); the
  acknowledgement sent for a declaration that was not recorded; a body with the guest pair's keys or an extra key
  accepted; the route registered without its body validation.
*/
const body = { customer_name: "  Kiss\u0007   Anna ", item_ids: ["item_1"] }

const run = async (over: { actor?: string | null; orderId?: string; body?: Record<string, unknown> } = {}) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const actor = over.actor === undefined ? "cus_a" : over.actor
  await POST(
    {
      auth_context: actor ? { actor_id: actor } : undefined,
      params: { order_id: over.orderId ?? "order_1" },
      validatedBody: { ...body, ...(over.body ?? {}) },
      scope: {},
    } as never,
    { json, status } as never,
  )
  return { json, status }
}

const standingList = [{ id: "ordwdr_1", created_at: "2026-11-05T18:00:00.000Z", item_ids: ["item_1"] }]

beforeEach(() => {
  guestWithdrawalsOf.mockResolvedValue(standingList)
  ownOrder.mockResolvedValue({ id: "order_1", itemIds: ["item_1"], displayId: 1042, email: "vevo@example.hu" })
  createWithdrawal.mockResolvedValue({
    status: "created",
    id: "ordwdr_1",
    createdAt: "2026-11-05T18:00:00.000Z",
    itemIds: ["item_1"],
    skipped: [],
  })
  notifyWithdrawalReceived.mockResolvedValue({ sent: true })
})
afterEach(() => {
  guestWithdrawalsOf.mockReset()
  storePickupOf.mockReset()
  ownOrder.mockReset()
  createWithdrawal.mockReset()
  notifyWithdrawalReceived.mockReset()
})

/*
  WHAT TURNS THIS RED (V0.3, the order page's read). The order opened with an id from the REQUEST instead of the session's;
  a miss answered with anything but the one 404, or no session served instead of refused (the pickup answer or the list
  of declarations of another customer's order would leak); the pickup flag not coming from the order's own read; the
  declarations left out when they CAN be read, or a failed read turned into an empty list (the page would then offer
  lines that are already declared).
*/
const get = async (over: { actor?: string | null; orderId?: string } = {}) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const actor = over.actor === undefined ? "cus_a" : over.actor
  await GET(
    {
      auth_context: actor ? { actor_id: actor } : undefined,
      params: { order_id: over.orderId ?? "order_1" },
      scope: {},
    } as never,
    { json, status } as never,
  )
  return { json, status }
}

describe("GET /store/customers/me/orders/:order_id/withdrawal", () => {
  it("opens the order with the SESSION's customer id and the path's order id", async () => {
    storePickupOf.mockResolvedValue(false)
    await get({ actor: "cus_a", orderId: "order_9" })
    expect(ownOrder.mock.calls[0].slice(1)).toEqual(["cus_a", "order_9"])
  })

  it("refuses with 401 and reads nothing without a session", async () => {
    const { status } = await get({ actor: null })
    expect(status).toHaveBeenCalledWith(401)
    expect(ownOrder).not.toHaveBeenCalled()
    expect(storePickupOf).not.toHaveBeenCalled()
  })

  it("answers the one 404 for another customer's order or a missing one, and reads neither the pickup nor the list", async () => {
    ownOrder.mockResolvedValue(null)
    const { json, status } = await get()
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(storePickupOf).not.toHaveBeenCalled()
    expect(guestWithdrawalsOf).not.toHaveBeenCalled()
  })

  it("answers the pickup flag and the standing declarations, both read for the order's own id", async () => {
    storePickupOf.mockResolvedValue(true)
    const { json } = await get()
    expect(json).toHaveBeenCalledWith({ store_pickup: true, withdrawals: standingList })
    expect(storePickupOf.mock.calls[0][1]).toBe("order_1")
    expect(guestWithdrawalsOf.mock.calls[0][1]).toBe("order_1")
  })

  it("leaves the declarations out when they cannot be read, instead of answering an empty list", async () => {
    storePickupOf.mockResolvedValue(false)
    guestWithdrawalsOf.mockResolvedValue(null)
    const { json } = await get()
    expect(json).toHaveBeenCalledWith({ store_pickup: false })
  })
})

describe("POST /store/customers/me/orders/:order_id/withdrawal", () => {
  it("opens the order with the SESSION's customer id and the path's order id, nothing else", async () => {
    await run({ actor: "cus_a", orderId: "order_9", body: { customer_id: "cus_b" } as never })
    expect(ownOrder).toHaveBeenCalledTimes(1)
    expect(ownOrder.mock.calls[0].slice(1)).toEqual(["cus_a", "order_9"])
  })

  it("refuses with 401 and looks nothing up when there is no session", async () => {
    const { status } = await run({ actor: null })
    expect(status).toHaveBeenCalledWith(401)
    expect(ownOrder).not.toHaveBeenCalled()
    expect(createWithdrawal).not.toHaveBeenCalled()
  })

  it("answers the one 404 when the order is not the customer's own (or does not exist), and records nothing", async () => {
    ownOrder.mockResolvedValue(null)
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(createWithdrawal).not.toHaveBeenCalled()
    expect(notifyWithdrawalReceived).not.toHaveBeenCalled()
  })

  it("records the declaration with the cleaned name and the order's items, and answers 201 like the guest route", async () => {
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(201)
    expect(json).toHaveBeenCalledWith({
      withdrawal_id: "ordwdr_1",
      created_at: "2026-11-05T18:00:00.000Z",
      withdrawals: standingList,
    })
    expect(createWithdrawal.mock.calls[0][1]).toEqual({
      id: "order_1",
      itemIds: ["item_1"],
      displayId: 1042,
      email: "vevo@example.hu",
    })
    expect(createWithdrawal.mock.calls[0][2]).toEqual({ customerName: "Kiss Anna", itemIds: ["item_1"] })
  })

  it("sends the acknowledgement once, to the order's own address, for the new declaration", async () => {
    await run()
    expect(notifyWithdrawalReceived).toHaveBeenCalledTimes(1)
    expect(notifyWithdrawalReceived.mock.calls[0][1]).toEqual({
      order: { id: "order_1", displayId: 1042, email: "vevo@example.hu" },
      withdrawalId: "ordwdr_1",
      declaredName: "Kiss Anna",
      itemIds: ["item_1"],
      receivedAt: "2026-11-05T18:00:00.000Z",
    })
  })

  it("a bad item is a 400, a duplicate a 409 with the standing id, an empty name a 400; none sends the acknowledgement", async () => {
    createWithdrawal.mockResolvedValue({ status: "bad_items" })
    expect((await run()).status).toHaveBeenCalledWith(400)
    createWithdrawal.mockResolvedValue({ status: "duplicate", id: "ordwdr_old", itemIds: ["item_1"] })
    const dup = await run()
    expect(dup.status).toHaveBeenCalledWith(409)
    expect(dup.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "already_declared", withdrawal_id: "ordwdr_old", item_ids: ["item_1"] }),
    )
    createWithdrawal.mockClear()
    const noName = await run({ body: { customer_name: " \u0007 " } })
    expect(noName.status).toHaveBeenCalledWith(400)
    expect(createWithdrawal).not.toHaveBeenCalled()
    expect(notifyWithdrawalReceived).not.toHaveBeenCalled()
  })
})

describe("a partly taken request", () => {
  it("is a 201 for the recorded lines that names the taken ones, like the guest route", async () => {
    createWithdrawal.mockResolvedValue({
      status: "created",
      id: "ordwdr_2",
      createdAt: "2026-11-05T18:05:00.000Z",
      itemIds: ["item_2"],
      skipped: [{ itemId: "item_1", withdrawalId: "ordwdr_1" }],
    })
    const { json, status } = await run({ body: { item_ids: ["item_1", "item_2"] } })
    expect(status).toHaveBeenCalledWith(201)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ withdrawal_id: "ordwdr_2", already_declared_item_ids: ["item_1"] }))
  })
})

describe("the signed-in withdrawal body", () => {
  const ok = { customer_name: "Kiss Anna", item_ids: ["item_1"] }

  it("accepts the two fields", () => {
    expect(StorePostCustomerWithdrawal.safeParse(ok).success).toBe(true)
  })

  it("is strict: the guest pair's keys, an extra key, no item, no name and over fifty items are refused", () => {
    for (const extra of [{ order_number: "1042" }, { email: "a@b.hu" }, { customer_id: "cus_b" }, { x: 1 }])
      expect(StorePostCustomerWithdrawal.safeParse({ ...ok, ...extra }).success).toBe(false)
    expect(StorePostCustomerWithdrawal.safeParse({ ...ok, item_ids: [] }).success).toBe(false)
    expect(StorePostCustomerWithdrawal.safeParse({ ...ok, customer_name: " " }).success).toBe(false)
    expect(
      StorePostCustomerWithdrawal.safeParse({ ...ok, item_ids: Array.from({ length: 51 }, (_, i) => `i${i}`) }).success,
    ).toBe(false)
  })
})

describe("the route's wiring", () => {
  it("is registered for POST with its body validation", () => {
    const route = (middlewares.routes ?? []).find(
      (r) => r.matcher === "/store/customers/me/orders/:order_id/withdrawal",
    ) as any
    expect(route).toBeDefined()
    expect(route.methods).toEqual(["POST"])
    expect(route.middlewares).toHaveLength(1)
  })

  it("sits under the stock customer authentication of /store/customers/me*", () => {
    const guard = storeCustomerRoutesMiddlewares.find(
      (route) => route.matcher === "/store/customers/me*" && route.method === "ALL",
    )
    expect(String(guard?.middlewares?.[0])).toContain("authenticate")
  })
})
