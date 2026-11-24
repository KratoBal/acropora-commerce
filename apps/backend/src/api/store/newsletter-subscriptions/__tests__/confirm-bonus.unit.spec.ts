import { COMMERCE_SETTINGS_MODULE } from "../../../../modules/commerce-settings"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import { POST } from "../confirm/route"

/*
  WHAT TURNS THIS RED (card dfb79916): the confirmation route paying the newsletter bonus for a link that did NOT confirm (invalid, expired);
  the bonus not paid after a real confirmation; the visitor's answer carrying anything but `{ result }` (the address must stay on the
  server); the points failing or throwing out of the confirmation link.
*/
const run = async (confirmation: { result: string; email?: string }, opts: { byEmail?: { id: string }[]; grant?: jest.Mock } = {}) => {
  const grant = opts.grant ?? jest.fn(async (i: { points: number }) => ({ balance: i.points, points: i.points, repeated: false }))
  const logger = { info: jest.fn(), error: jest.fn() }
  const scope = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === NEWSLETTER_MODULE)
        return {
          confirmByTokenWithEmail: async () => confirmation,
          listNewsletterSubscribers: async () => [{ id: "nl_1" }],
        }
      if (key === COMMERCE_SETTINGS_MODULE) return { listCommerceSettings: async () => [{ key: "loyalty_accrual_enabled", value: "1" }] }
      if (key === "customer")
        return {
          listCustomers: async () => opts.byEmail ?? [{ id: "cus_1" }],
          retrieveCustomer: async () => ({ id: "cus_1", email: "vevo@example.hu", has_account: true }),
        }
      if (key === LOYALTY_MODULE) return { grantBonus: grant }
      throw new Error(`unknown ${key}`)
    },
  }
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST({ scope, validatedBody: { token: "t" } } as never, { status, json } as never)
  return { json, status, grant }
}

describe("POST /store/newsletter-subscriptions/confirm", () => {
  it("a confirmed link pays the newsletter bonus to the customer with that address, and answers only { result }", async () => {
    const { json, status, grant } = await run({ result: "confirmed", email: "vevo@example.hu" })
    expect(grant).toHaveBeenCalledWith({ customer_id: "cus_1", kind: "newsletter", points: 500 })
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ result: "confirmed" })
  })

  it("an invalid or expired link pays nothing and answers the same shape", async () => {
    for (const result of ["invalid", "expired"]) {
      const { json, grant } = await run({ result })
      expect(grant).not.toHaveBeenCalled()
      expect(json).toHaveBeenCalledWith({ result })
    }
  })

  it("a confirmation for an address without an account pays nobody, and still confirms", async () => {
    const { json, grant } = await run({ result: "confirmed", email: "valaki@example.hu" }, { byEmail: [] })
    expect(grant).not.toHaveBeenCalled()
    expect(json).toHaveBeenCalledWith({ result: "confirmed" })
  })

  it("a failing ledger does not fail the confirmation", async () => {
    const { json } = await run({ result: "confirmed", email: "vevo@example.hu" }, { grant: jest.fn(async () => Promise.reject(new Error("db down"))) })
    expect(json).toHaveBeenCalledWith({ result: "confirmed" })
  })
})
