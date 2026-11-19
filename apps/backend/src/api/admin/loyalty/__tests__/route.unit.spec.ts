const adjustLoyalty = jest.fn()
const readLoyalty = jest.fn()
jest.mock("../../../../workflows/utils/loyalty/loyalty", () => ({
  ...jest.requireActual("../../../../workflows/utils/loyalty/loyalty"),
  loyaltyOperations: () => ({}),
  adjustLoyalty: (...args: unknown[]) => adjustLoyalty(...args),
  readLoyalty: (...args: unknown[]) => readLoyalty(...args),
}))

import { MAX_POINTS } from "../../../../modules/loyalty/types"
import { GET as storeGet } from "../../../store/customers/me/loyalty/route"
import { StoreGetLoyaltyParams } from "../../../store/customers/me/loyalty/validators"
import { POST } from "../adjustments/route"
import { GET } from "../[customer_id]/route"
import { AdminGetLoyaltyParams, AdminPostLoyaltyAdjustment } from "../validators"

/*
  WHAT TURNS THIS RED. A zero, fractional, over-the-bound or unexplained movement reaching the module; an extra key
  accepted; a status the OS reads wrongly (201 created, 200 replay, 404 customer, 409 conflict/overdraw with the
  balance); the store read taking a customer id from the request instead of the session, or showing the staff's fields.
*/
const call = async (handler: (req: never, res: never) => Promise<void>, req: Record<string, unknown>) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await handler({ scope: {}, ...req } as never, { json, status } as never)
  return { json, status }
}

afterEach(() => {
  adjustLoyalty.mockReset()
  readLoyalty.mockReset()
})

const entry = { id: "loyent_1", kind: "adjustment", points: 5, order_id: null, reference: null, reason: "r", actor: "user_1", customer_id: "cus_1", created_at: new Date("2026-11-19T00:00:00Z") }

describe("the adjustment body", () => {
  const ok = { customer_id: "cus_1", points: 100, reason: "kompenzáció" }

  it("takes a whole, signed, explained movement", () => {
    expect(AdminPostLoyaltyAdjustment.parse(ok)).toEqual(ok)
    expect(AdminPostLoyaltyAdjustment.parse({ ...ok, points: -100, reference: "os-1" }).points).toBe(-100)
    expect(AdminPostLoyaltyAdjustment.parse({ ...ok, points: MAX_POINTS }).points).toBe(MAX_POINTS)
  })

  it("refuses zero, a fraction, a text number, the bound plus one, no reason, a blank key and an extra key", () => {
    const accepted = [
      { ...ok, points: 0 },
      { ...ok, points: 1.5 },
      { ...ok, points: "10" },
      { ...ok, points: MAX_POINTS + 1 },
      { ...ok, points: -MAX_POINTS - 1 },
      { ...ok, reason: "   " },
      { customer_id: "cus_1", points: 5 },
      { ...ok, reference: "  " },
      { ...ok, extra: 1 },
      { ...ok, customer_id: "" },
    ].filter((bad) => AdminPostLoyaltyAdjustment.safeParse(bad).success)
    expect(accepted).toEqual([])
  })

  it("has a limit of fifty by default and at most one hundred", () => {
    expect(AdminGetLoyaltyParams.parse({}).limit).toBe(50)
    expect(AdminGetLoyaltyParams.safeParse({ limit: "101" }).success).toBe(false)
    expect(StoreGetLoyaltyParams.parse({}).limit).toBe(20)
    expect(StoreGetLoyaltyParams.safeParse({ limit: "51" }).success).toBe(false)
  })
})

describe("POST /admin/loyalty/adjustments", () => {
  const req = { validatedBody: { customer_id: "cus_1", points: 5, reason: "r" }, auth_context: { actor_id: "user_1" } }

  it("answers 201 for a new row and 200 for a replay, with the balance", async () => {
    adjustLoyalty.mockResolvedValueOnce({ status: "created", entry, balance: 5 })
    const created = await call(POST, req)
    expect(created.status).toHaveBeenCalledWith(201)
    expect(created.json.mock.calls[0][0]).toMatchObject({ balance: 5, entry: { id: "loyent_1", reason: "r", actor: "user_1" } })
    adjustLoyalty.mockResolvedValueOnce({ status: "replayed", entry, balance: 5 })
    expect((await call(POST, req)).status).toHaveBeenCalledWith(200)
    expect(adjustLoyalty.mock.calls[0][1]).toEqual(req.validatedBody)
    expect(adjustLoyalty.mock.calls[0][2]).toBe("user_1")
  })

  it("answers 404 for an unknown customer and 409 for a key conflict and an overdraw (with the balance)", async () => {
    adjustLoyalty.mockResolvedValueOnce({ status: "customer_not_found" })
    expect((await call(POST, req)).status).toHaveBeenCalledWith(404)
    adjustLoyalty.mockResolvedValueOnce({ status: "reference_conflict" })
    const conflict = await call(POST, req)
    expect(conflict.status).toHaveBeenCalledWith(409)
    expect(conflict.json.mock.calls[0][0]).toMatchObject({ code: "reference_conflict" })
    adjustLoyalty.mockResolvedValueOnce({ status: "overdraw", balance: 3 })
    const overdraw = await call(POST, req)
    expect(overdraw.status).toHaveBeenCalledWith(409)
    expect(overdraw.json.mock.calls[0][0]).toMatchObject({ code: "overdraw", balance: 3 })
  })
})

describe("GET /admin/loyalty/:customer_id", () => {
  it("answers the balance and the rows with the staff's fields, and 404 for an unknown customer", async () => {
    readLoyalty.mockResolvedValueOnce({ status: "ok", balance: 5, entries: [entry] })
    const ok = await call(GET, { params: { customer_id: "cus_1" }, validatedQuery: { limit: 50 } })
    expect(ok.json.mock.calls[0][0]).toMatchObject({ customer_id: "cus_1", balance: 5, entries: [{ reason: "r", actor: "user_1" }] })
    expect(readLoyalty.mock.calls[0][2]).toEqual({ limit: 50, checkCustomer: true })
    readLoyalty.mockResolvedValueOnce({ status: "customer_not_found" })
    expect((await call(GET, { params: { customer_id: "cus_x" }, validatedQuery: { limit: 50 } })).status).toHaveBeenCalledWith(404)
  })
})

describe("GET /store/customers/me/loyalty", () => {
  it("reads the SESSION's customer, never one from the request, and shows no reason or actor", async () => {
    readLoyalty.mockResolvedValueOnce({ status: "ok", balance: 5, entries: [entry] })
    const ok = await call(storeGet, {
      auth_context: { actor_id: "cus_session" },
      params: { customer_id: "cus_other" },
      query: { customer_id: "cus_other" },
      validatedQuery: { limit: 20 },
    })
    expect(readLoyalty.mock.calls[0][1]).toBe("cus_session")
    expect(readLoyalty.mock.calls[0][2]).toEqual({ limit: 20, checkCustomer: false })
    const body = ok.json.mock.calls[0][0]
    expect(body.balance).toBe(5)
    expect(JSON.stringify(body)).not.toContain("actor")
    expect(JSON.stringify(body)).not.toContain('"reason"')
  })

  it("answers 401 without a session customer, and reads nothing", async () => {
    const none = await call(storeGet, { auth_context: undefined, validatedQuery: { limit: 20 } })
    expect(none.status).toHaveBeenCalledWith(401)
    expect(readLoyalty).not.toHaveBeenCalled()
  })
})
