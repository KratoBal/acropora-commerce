const accessibleOrder = jest.fn()
const createWithdrawal = jest.fn()
jest.mock("../../../../../workflows/utils/problem-report/report", () => ({
  accessibleOrder: (...args: unknown[]) => accessibleOrder(...args),
}))
jest.mock("../../../../../workflows/utils/withdrawal/withdrawal", () => ({
  createWithdrawal: (...args: unknown[]) => createWithdrawal(...args),
}))

import middlewares from "../../../../middlewares"
import { guestWithdrawalAddressAttempts, guestWithdrawalNumberAttempts } from "../../../../attempt-limits"
import { POST } from "../route"
import { StorePostGuestWithdrawal } from "../validators"

/*
  WHAT TURNS THIS RED (V0.3, the declaration route). A miss answered with anything but the one 404; a declaration
  made for a wrong item (400, nothing written); the number parsed wrongly; the name stored raw (control characters,
  runs of spaces); a name that is empty once cleaned accepted; a duplicate answered as a new declaration; a body
  with an extra key, no item, no name or more than fifty items accepted; the route registered without its limits
  or with them after the validation.
*/
const body = {
  order_number: "#01042",
  email: "vevo@example.hu",
  customer_name: "  Kiss\u0007   Anna ",
  item_ids: ["item_1"],
}

const run = async (over: Record<string, unknown> = {}) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST({ validatedBody: { ...body, ...over }, scope: {} } as never, { json, status } as never)
  return { json, status }
}

beforeEach(() => {
  accessibleOrder.mockResolvedValue({ id: "order_1", itemIds: ["item_1"], displayId: 1042, email: "vevo@example.hu" })
  createWithdrawal.mockResolvedValue({ status: "created", id: "ordwdr_1", createdAt: "2026-11-05T18:00:00.000Z" })
})
afterEach(() => {
  accessibleOrder.mockReset()
  createWithdrawal.mockReset()
})

describe("POST /store/guest-orders/withdrawal", () => {
  it("a miss is one 404 with one text, and nothing is created", async () => {
    accessibleOrder.mockResolvedValue(null)
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(createWithdrawal).not.toHaveBeenCalled()
  })

  it("records the declaration with the cleaned name and answers its id and time of receipt", async () => {
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(201)
    expect(json).toHaveBeenCalledWith({ withdrawal_id: "ordwdr_1", created_at: "2026-11-05T18:00:00.000Z" })
    expect(accessibleOrder).toHaveBeenCalledWith(expect.anything(), 1042, "vevo@example.hu")
    expect(createWithdrawal.mock.calls[0][2]).toEqual({ customerName: "Kiss Anna", itemIds: ["item_1"] })
  })

  it("a name that is empty once cleaned is a 400 and nothing is created", async () => {
    const { json, status } = await run({ customer_name: "\u0007 \u0001" })
    expect(status).toHaveBeenCalledWith(400)
    expect(json.mock.calls[0][0].type).toBe("invalid_data")
    expect(createWithdrawal).not.toHaveBeenCalled()
  })

  it("a wrong item is a 400 with its own type", async () => {
    createWithdrawal.mockResolvedValue({ status: "bad_items" })
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(400)
    expect(json.mock.calls[0][0].type).toBe("invalid_items")
  })

  it("answers 409 with the reference that stands for a line already withdrawn from", async () => {
    createWithdrawal.mockResolvedValue({ status: "duplicate", id: "ordwdr_old" })
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(409)
    expect(json).toHaveBeenCalledWith({
      type: "already_declared",
      withdrawal_id: "ordwdr_old",
      message: "Erről a tételről már van elállási nyilatkozatod.",
    })
  })
})

describe("the declaration's body and registration", () => {
  const base = { order_number: "1042", email: "a@b.hu", customer_name: "Kiss Anna", item_ids: ["item_1"] }
  const parse = (over: Record<string, unknown> = {}) => StorePostGuestWithdrawal.safeParse({ ...base, ...over })

  it("accepts the minimal body", () => {
    expect(parse().success).toBe(true)
  })

  it("refuses an extra key, no item, no name, a long name, a bad number or address, fifty-one items", () => {
    expect(parse({ extra: 1 }).success).toBe(false)
    expect(parse({ item_ids: [] }).success).toBe(false)
    expect(parse({ customer_name: "   " }).success).toBe(false)
    expect(parse({ customer_name: "x".repeat(201) }).success).toBe(false)
    expect(parse({ order_number: "abc" }).success).toBe(false)
    expect(parse({ email: "nem-cim" }).success).toBe(false)
    expect(parse({ item_ids: Array.from({ length: 51 }, (_, i) => `i${i}`) }).success).toBe(false)
    expect(parse({ item_ids: Array.from({ length: 50 }, (_, i) => `i${i}`) }).success).toBe(true)
  })

  it("has the limits BEFORE the validation, and its own limits (not the report's)", () => {
    const entry = (middlewares.routes ?? []).find((r) => r.matcher === "/store/guest-orders/withdrawal") as any
    expect(entry).toBeDefined()
    expect(entry.methods).toEqual(["POST"])
    expect(entry.middlewares).toHaveLength(3)
    expect(entry.middlewares[0]).toBe(guestWithdrawalAddressAttempts)
    expect(entry.middlewares[1]).toBe(guestWithdrawalNumberAttempts)
  })
})
