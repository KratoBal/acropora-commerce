const lookupGuestOrders = jest.fn()
jest.mock("../../../../../workflows/utils/guest-order/lookup", () => ({
  lookupGuestOrders: (...args: unknown[]) => lookupGuestOrders(...args),
}))
jest.mock("../../../../../workflows/utils/guest-order/operations", () => ({
  guestOrderOperations: () => ({ marker: "deps" }),
}))

import middlewares from "../../../../middlewares"
import { guestOrderAddressAttempts, guestOrderNumberAttempts, orderNumberKeyOf } from "../../../../attempt-limits"
import { POST } from "../route"
import { StorePostGuestOrderLookup } from "../validators"

/*
  WHAT TURNS THIS RED (V1.1). A miss answered with anything but the one 404 text; the order number
  parsed wrongly (a `#` kept, leading zeros); the route registered WITHOUT the attempt limits or with
  them AFTER the validation (a malformed flood would not count); a body with an extra key accepted; an
  address that is not an address accepted.
*/
const run = async (body: { order_number: string; email: string }) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST({ validatedBody: body, scope: {} } as never, { json, status } as never)
  return { json, status }
}

afterEach(() => lookupGuestOrders.mockReset())

describe("POST /store/guest-orders/lookup", () => {
  it("a miss is one 404 with one text", async () => {
    lookupGuestOrders.mockResolvedValue(null)
    const { json, status } = await run({ order_number: "1042", email: "vevo@example.hu" })
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
  })

  it("a hit answers the orders as they are", async () => {
    lookupGuestOrders.mockResolvedValue([{ display_id: 1042 }])
    const { json, status } = await run({ order_number: "1042", email: "vevo@example.hu" })
    expect(status).not.toHaveBeenCalled()
    expect(json).toHaveBeenCalledWith({ orders: [{ display_id: 1042 }] })
  })

  it("the number reaches the lookup as a plain integer, without '#' and leading zeros", async () => {
    lookupGuestOrders.mockResolvedValue(null)
    await run({ order_number: "#01042", email: "vevo@example.hu" })
    expect(lookupGuestOrders).toHaveBeenCalledWith({ displayId: 1042, email: "vevo@example.hu" }, expect.anything())
  })
})

describe("the lookup's body", () => {
  const parse = (value: unknown) => StorePostGuestOrderLookup.safeParse(value).success

  it("accepts a number (with an optional '#') and an address", () => {
    expect(parse({ order_number: "1042", email: "vevo@example.hu" })).toBe(true)
    expect(parse({ order_number: "#1042", email: " vevo@example.hu " })).toBe(true)
  })

  it("refuses an extra key, a non-number, an address that is not one, and a missing field", () => {
    expect(parse({ order_number: "1042", email: "vevo@example.hu", extra: 1 })).toBe(false)
    expect(parse({ order_number: "12ab", email: "vevo@example.hu" })).toBe(false)
    expect(parse({ order_number: "", email: "vevo@example.hu" })).toBe(false)
    expect(parse({ order_number: "12345678901", email: "vevo@example.hu" })).toBe(false)
    expect(parse({ order_number: "1042", email: "nem-cim" })).toBe(false)
    expect(parse({ order_number: "1042" })).toBe(false)
    expect(parse({ email: "vevo@example.hu" })).toBe(false)
  })
})

describe("the route's registration", () => {
  it("has the two attempt limits BEFORE the validation", () => {
    const entry = (middlewares.routes ?? []).find((r) => r.matcher === "/store/guest-orders/lookup")
    expect(entry).toBeDefined()
    const list = entry?.middlewares ?? []
    expect(list).toHaveLength(3)
    expect(list[0]).toBe(guestOrderAddressAttempts)
    expect(list[1]).toBe(guestOrderNumberAttempts)
  })
})

describe("the order number key", () => {
  it("'#1042', '1042' and '001042' are one key; anything else has none", () => {
    expect(orderNumberKeyOf({ order_number: "#1042" })).toBe("1042")
    expect(orderNumberKeyOf({ order_number: " 1042 " })).toBe("1042")
    expect(orderNumberKeyOf({ order_number: "001042" })).toBe("1042")
    expect(orderNumberKeyOf({ order_number: "12ab" })).toBeNull()
    expect(orderNumberKeyOf({ order_number: 1042 })).toBeNull()
    expect(orderNumberKeyOf({})).toBeNull()
    expect(orderNumberKeyOf(undefined)).toBeNull()
  })
})
