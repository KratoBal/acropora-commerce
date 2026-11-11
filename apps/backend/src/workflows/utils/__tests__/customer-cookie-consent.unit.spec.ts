import { POST } from "../../../api/store/customers/me/suti-hozzajarulas/route"
import { StorePostSutiHozzajarulas } from "../../../api/store/customers/me/suti-hozzajarulas/validators"
import middlewares from "../../../api/middlewares"
import { saveCustomerCookieConsent } from "../customer-cookie-consent"

/**
 * THE SIGNED-IN CUSTOMER'S COOKIE DECISION ON THE SERVER (card d5515c7d).
 * What must fail: the time coming from the request; a later decision (a
 * withdrawal) not replacing the earlier one; more than the own key sent to
 * the customer update; an unknown customer written to; the route answering
 * without a customer-bound token, or left without its validator.
 */
const CLAIM = { verzio: "2026-11-11", statisztika: true, marketing: false }
const NOW = new Date("2026-11-11T19:00:00.000Z")

const fake = (customer: unknown) => {
  const updates: unknown[][] = []
  const container = {
    resolve: () => ({
      retrieveCustomer: async () => {
        if (!customer) throw new Error("not found")
        return customer
      },
      updateCustomers: async (...args: unknown[]) => void updates.push(args),
    }),
  }
  return { container: container as never, updates }
}

describe("saveCustomerCookieConsent", () => {
  it("writes the decision with the server's clock, under its own key only", async () => {
    const { container, updates } = fake({ id: "cus_1" })
    const result = await saveCustomerCookieConsent(container, "cus_1", CLAIM, NOW)
    const record = { ...CLAIM, idopont: NOW.toISOString() }
    expect(result).toEqual({ status: "saved", record })
    expect(updates).toEqual([["cus_1", { metadata: { suti_hozzajarulas: record } }]])
  })

  it("a later decision replaces the earlier one (a withdrawal is recorded)", async () => {
    const { container, updates } = fake({ id: "cus_1" })
    await saveCustomerCookieConsent(container, "cus_1", { ...CLAIM, marketing: true }, NOW)
    const later = new Date("2026-11-12T08:00:00.000Z")
    await saveCustomerCookieConsent(container, "cus_1", { ...CLAIM, statisztika: false }, later)
    expect(updates[1]).toEqual([
      "cus_1",
      { metadata: { suti_hozzajarulas: { verzio: "2026-11-11", statisztika: false, marketing: false, idopont: later.toISOString() } } },
    ])
  })

  it("an unknown customer: not_found, nothing written", async () => {
    const { container, updates } = fake(null)
    expect(await saveCustomerCookieConsent(container, "cus_x", CLAIM, NOW)).toEqual({ status: "not_found" })
    expect(updates).toEqual([])
  })
})

describe("the request body", () => {
  it.each([
    CLAIM,
    { verzio: "v1.2-b_3", statisztika: false, marketing: false },
  ])("accepts %j", (body) => {
    expect(StorePostSutiHozzajarulas.safeParse(body).success).toBe(true)
  })

  it.each([
    { ...CLAIM, idopont: "2020-01-01T00:00:00.000Z" },
    { ...CLAIM, szukseges: false },
    { ...CLAIM, statisztika: "true" },
    { verzio: "2026-11-11", statisztika: true },
    { ...CLAIM, verzio: "" },
    { ...CLAIM, verzio: "a".repeat(41) },
    { ...CLAIM, verzio: "<script>" },
  ])("refuses %j", (body) => {
    expect(StorePostSutiHozzajarulas.safeParse(body).success).toBe(false)
  })
})

describe("POST /store/customers/me/suti-hozzajarulas", () => {
  const call = async (actorId: string | undefined, customer: unknown) => {
    const { container, updates } = fake(customer)
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
    await POST(
      { scope: container, auth_context: { actor_id: actorId }, validatedBody: CLAIM } as never,
      res as never
    )
    return { res, updates }
  }

  it("401 without a customer-bound token, nothing written", async () => {
    const { res, updates } = await call(undefined, { id: "cus_1" })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(updates).toEqual([])
  })

  it("404 for an unknown customer", async () => {
    const { res } = await call("cus_x", null)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("answers the stored record", async () => {
    const { res } = await call("cus_1", { id: "cus_1" })
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json.mock.calls[0][0].suti_hozzajarulas).toMatchObject(CLAIM)
  })

  it("the route has its validator", () => {
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/customers/me/suti-hozzajarulas" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toHaveLength(1)
  })
})
