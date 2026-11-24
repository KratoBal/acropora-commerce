import { Modules } from "@medusajs/framework/utils"

import { COMMERCE_SETTINGS_MODULE } from "../../../../modules/commerce-settings"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import { grantLoyaltyBonuses, grantNewsletterBonusForEmail } from "../grant-bonuses"

/*
  WHAT TURNS THIS RED (card dfb79916; the old shop: 500 points after registering, 500 after confirming the newsletter): a bonus credited while
  the accrual's master switch is off; a guest checkout's customer (has_account false) credited; the newsletter bonus credited without a
  CONFIRMED subscription (a pending or missing one), or the signup bonus held back by the newsletter; the points settable numbers not
  winning (0 = none); a bonus credited twice (the ledger answers `repeated`); a ledger or customer failure throwing out of the
  registration or the confirmation link instead of being logged with what to credit by hand; the confirmation of an address without an
  account crediting someone.
*/
const ON = [{ key: "loyalty_accrual_enabled", value: "1" }]

const make = (opts: {
  rows?: { key: string; value: unknown }[]
  customer?: { id: string; email?: string | null; has_account?: boolean | null } | Error
  subscribers?: { email: string; status: string }[]
  grant?: jest.Mock
  byEmail?: { id: string }[]
}) => {
  const logger = { info: jest.fn(), error: jest.fn() }
  const grant = opts.grant ?? jest.fn(async (i: { points: number }) => ({ balance: i.points, points: i.points, repeated: false }))
  const subscribers = opts.subscribers ?? []
  const container = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === COMMERCE_SETTINGS_MODULE) return { listCommerceSettings: async () => opts.rows ?? [] }
      if (key === Modules.CUSTOMER)
        return {
          retrieveCustomer: async () => {
            if (opts.customer instanceof Error) throw opts.customer
            return opts.customer ?? { id: "cus_1", email: "Vevo@Example.hu", has_account: true }
          },
          listCustomers: async () => opts.byEmail ?? [],
        }
      if (key === NEWSLETTER_MODULE)
        return {
          listNewsletterSubscribers: async (f: { email: string; status: string }) =>
            subscribers.filter((s) => s.email === f.email && s.status === f.status),
        }
      if (key === LOYALTY_MODULE) return { grantBonus: grant }
      throw new Error(`unknown ${key}`)
    },
  }
  return { container, logger, grant }
}

describe("grantLoyaltyBonuses", () => {
  it("a registration credits the sign-up bonus (500 by default), once, naming the kind", async () => {
    const { container, grant } = make({ rows: ON })
    const outcome = await grantLoyaltyBonuses(container as never, "cus_1")
    expect(outcome.signup).toEqual({ status: "credited", points: 500, repeated: false })
    expect(grant).toHaveBeenCalledWith({ customer_id: "cus_1", kind: "signup", points: 500 })
    expect(outcome.newsletter).toEqual({ status: "none_due" })
  })

  it("with the master switch off (no row) nothing is read or credited", async () => {
    const { container, grant } = make({})
    expect(await grantLoyaltyBonuses(container as never, "cus_1")).toEqual({ signup: { status: "off" }, newsletter: { status: "off" } })
    expect(grant).not.toHaveBeenCalled()
  })

  it("a guest checkout's customer (has_account false, or the flag missing) is credited nothing", async () => {
    for (const has_account of [false, null, undefined]) {
      const { container, grant } = make({ rows: ON, customer: { id: "cus_1", email: "vendeg@example.hu", has_account } })
      expect((await grantLoyaltyBonuses(container as never, "cus_1")).signup).toEqual({ status: "no_account" })
      expect(grant).not.toHaveBeenCalled()
    }
  })

  it("the newsletter bonus needs a CONFIRMED subscription of the customer's address (case-insensitive); a pending or missing one pays nothing", async () => {
    const confirmed = make({ rows: ON, subscribers: [{ email: "vevo@example.hu", status: "confirmed" }] })
    const paid = await grantLoyaltyBonuses(confirmed.container as never, "cus_1")
    expect(paid.newsletter).toEqual({ status: "credited", points: 500, repeated: false })
    expect(confirmed.grant).toHaveBeenCalledWith({ customer_id: "cus_1", kind: "newsletter", points: 500 })
    for (const subscribers of [[{ email: "vevo@example.hu", status: "pending" }], [], [{ email: "masik@example.hu", status: "confirmed" }]]) {
      const { container, grant } = make({ rows: ON, subscribers })
      expect((await grantLoyaltyBonuses(container as never, "cus_1")).newsletter).toEqual({ status: "none_due" })
      expect(grant).not.toHaveBeenCalledWith(expect.objectContaining({ kind: "newsletter" }))
    }
  })

  it("the numbers are settable: another value is credited, 0 pays nothing", async () => {
    const other = make({ rows: [...ON, { key: "loyalty_signup_bonus_points", value: "300" }, { key: "loyalty_newsletter_bonus_points", value: "0" }], subscribers: [{ email: "vevo@example.hu", status: "confirmed" }] })
    const outcome = await grantLoyaltyBonuses(other.container as never, "cus_1")
    expect(outcome.signup).toEqual({ status: "credited", points: 300, repeated: false })
    expect(outcome.newsletter).toEqual({ status: "none_due" })
    expect(other.grant).toHaveBeenCalledTimes(1)
  })

  it("a repeated event is answered as repeated, the ledger having stored nothing", async () => {
    const grant = jest.fn(async () => ({ balance: 500, points: 500, repeated: true }))
    const { container, logger } = make({ rows: ON, grant })
    expect((await grantLoyaltyBonuses(container as never, "cus_1")).signup).toEqual({ status: "credited", points: 500, repeated: true })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("(already done)"))
  })

  it("a ledger failure is logged with the points to credit by hand, never thrown, and does not stop the other bonus", async () => {
    const grant = jest.fn(async (i: { kind: string }) => (i.kind === "signup" ? Promise.reject(new Error("db down")) : { balance: 500, points: 500, repeated: false }))
    const { container, logger } = make({ rows: ON, grant, subscribers: [{ email: "vevo@example.hu", status: "confirmed" }] })
    const outcome = await grantLoyaltyBonuses(container as never, "cus_1")
    expect(outcome.signup).toEqual({ status: "failed", message: "db down" })
    expect(outcome.newsletter).toEqual({ status: "credited", points: 500, repeated: false })
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/signup bonus \(500 points, customer cus_1\).*db down.*by hand/))
  })

  it("an unreadable customer is a logged failure, not a credit and not a throw", async () => {
    const { container, grant, logger } = make({ rows: ON, customer: new Error("gone") })
    const outcome = await grantLoyaltyBonuses(container as never, "cus_1")
    expect(outcome.signup).toMatchObject({ status: "failed" })
    expect(grant).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
  })
})

describe("grantNewsletterBonusForEmail", () => {
  it("credits the customer WITH an account that has the address, and answers what was credited", async () => {
    const { container, grant } = make({ rows: ON, byEmail: [{ id: "cus_1" }], subscribers: [{ email: "vevo@example.hu", status: "confirmed" }] })
    const outcome = await grantNewsletterBonusForEmail(container as never, " Vevo@Example.hu ")
    expect(outcome?.newsletter).toEqual({ status: "credited", points: 500, repeated: false })
    expect(grant).toHaveBeenCalledWith({ customer_id: "cus_1", kind: "newsletter", points: 500 })
  })

  it("an address without an account credits nobody (the registration pays it later)", async () => {
    const { container, grant } = make({ rows: ON, byEmail: [] })
    expect(await grantNewsletterBonusForEmail(container as never, "valaki@example.hu")).toBeNull()
    expect(grant).not.toHaveBeenCalled()
  })

  it("never throws: a failing customer lookup answers null", async () => {
    const container = { resolve: () => ({ listCustomers: async () => Promise.reject(new Error("db down")) }) }
    expect(await grantNewsletterBonusForEmail(container as never, "valaki@example.hu")).toBeNull()
  })
})
