const accessibleOrder = jest.fn()
const createReport = jest.fn()
jest.mock("../../../../../workflows/utils/problem-report/report", () => ({
  accessibleOrder: (...args: unknown[]) => accessibleOrder(...args),
  createReport: (...args: unknown[]) => createReport(...args),
}))

import middlewares from "../../../../middlewares"
import { guestProblemAddressAttempts, guestProblemNumberAttempts } from "../../../../attempt-limits"
import { POST } from "../route"
import { StorePostGuestProblem } from "../validators"

/*
  WHAT TURNS THIS RED (V1.2, the report route). A miss answered with anything but the one 404; a report made for a
  wrong item or photo (400, nothing written); the number parsed wrongly; the description or phone stored raw;
  a body with an extra key, an unknown kind, no item, more than five photos or a malformed time accepted; the
  route registered without its limits or with them after the validation.
*/
const body = {
  order_number: "#01042",
  email: "vevo@example.hu",
  kind: "item_damaged" as const,
  item_ids: ["item_1"],
  description: "  Törött\u0007 ",
  phone: " +36 30 123 4567 ",
  photo_ids: ["img_1"],
  received_at: "2026-11-03T10:00:00+01:00",
}

const run = async (over: Record<string, unknown> = {}) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST({ validatedBody: { ...body, ...over }, scope: {} } as never, { json, status } as never)
  return { json, status }
}

beforeEach(() => {
  accessibleOrder.mockResolvedValue({ id: "order_1", itemIds: ["item_1"] })
  createReport.mockResolvedValue({ status: "created", id: "rep_1", createdAt: "2026-11-04T10:00:00.000Z" })
})
afterEach(() => {
  accessibleOrder.mockReset()
  createReport.mockReset()
})

describe("POST /store/guest-orders/problem", () => {
  it("a miss is one 404 with one text, and nothing is created", async () => {
    accessibleOrder.mockResolvedValue(null)
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(createReport).not.toHaveBeenCalled()
  })

  it("creates the report from the cleaned values and answers its id and time", async () => {
    const { json, status } = await run()
    expect(status).toHaveBeenCalledWith(201)
    expect(json).toHaveBeenCalledWith({ report_id: "rep_1", created_at: "2026-11-04T10:00:00.000Z" })
    expect(accessibleOrder).toHaveBeenCalledWith(expect.anything(), 1042, "vevo@example.hu")
    const input = createReport.mock.calls[0][2]
    expect(input).toMatchObject({
      kind: "item_damaged",
      itemIds: ["item_1"],
      description: "Törött",
      phone: "+36 30 123 4567",
      photoIds: ["img_1"],
    })
    expect(input.receivedAt).toEqual(new Date("2026-11-03T10:00:00+01:00"))
  })

  it("a missing time and phone are null", async () => {
    await run({ received_at: undefined, phone: undefined })
    expect(createReport.mock.calls[0][2]).toMatchObject({ receivedAt: null, phone: null })
  })

  it("a wrong item or photo is a 400 with its own type", async () => {
    createReport.mockResolvedValue({ status: "bad_items" })
    let r = await run()
    expect(r.status).toHaveBeenCalledWith(400)
    expect(r.json.mock.calls[0][0].type).toBe("invalid_items")
    createReport.mockResolvedValue({ status: "bad_photos" })
    r = await run()
    expect(r.status).toHaveBeenCalledWith(400)
    expect(r.json.mock.calls[0][0].type).toBe("invalid_photos")
  })
})

describe("the report's body and registration", () => {
  const base = { order_number: "1042", email: "a@b.hu", kind: "other", item_ids: ["item_1"], description: "x" }
  const parse = (over: Record<string, unknown> = {}) => StorePostGuestProblem.safeParse({ ...base, ...over })

  it("accepts the minimal body (photos default to none)", () => {
    const result = parse()
    expect(result.success).toBe(true)
    expect(result.success && result.data.photo_ids).toEqual([])
  })

  it("refuses an extra key, an unknown kind, no item, an empty description, a bad time or phone, six photos", () => {
    expect(parse({ extra: 1 }).success).toBe(false)
    expect(parse({ kind: "gyanus" }).success).toBe(false)
    expect(parse({ item_ids: [] }).success).toBe(false)
    expect(parse({ description: "   " }).success).toBe(false)
    expect(parse({ description: "x".repeat(2001) }).success).toBe(false)
    expect(parse({ received_at: "tegnap" }).success).toBe(false)
    expect(parse({ phone: "abc" }).success).toBe(false)
    expect(parse({ photo_ids: ["1", "2", "3", "4", "5", "6"] }).success).toBe(false)
    expect(parse({ photo_ids: ["1", "2", "3", "4", "5"] }).success).toBe(true)
    expect(parse({ item_ids: Array.from({ length: 51 }, (_, i) => `i${i}`) }).success).toBe(false)
  })

  it("has the limits BEFORE the validation", () => {
    const entry = (middlewares.routes ?? []).find((r) => r.matcher === "/store/guest-orders/problem") as any
    expect(entry).toBeDefined()
    expect(entry.middlewares).toHaveLength(3)
    expect(entry.middlewares[0]).toBe(guestProblemAddressAttempts)
    expect(entry.middlewares[1]).toBe(guestProblemNumberAttempts)
  })
})
