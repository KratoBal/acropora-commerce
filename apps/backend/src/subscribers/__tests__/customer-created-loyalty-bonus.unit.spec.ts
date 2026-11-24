import { Modules } from "@medusajs/framework/utils"

import { COMMERCE_SETTINGS_MODULE } from "../../modules/commerce-settings"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import customerCreatedLoyaltyBonus, { config } from "../customer-created-loyalty-bonus"

/*
  WHAT TURNS THIS RED (card dfb79916): the subscriber not listening to customer.created; a registration (has_account true) not paying the
  sign-up bonus; a guest checkout's customer record paying it; an event without a customer id touching anything; a failing ledger
  throwing out of the registration.
*/
const run = async (customer: { has_account: boolean } | null, grant = jest.fn(async (i: { points: number }) => ({ balance: i.points, points: i.points, repeated: false })), id: string = "cus_1") => {
  const logger = { info: jest.fn(), error: jest.fn() }
  const container = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === COMMERCE_SETTINGS_MODULE) return { listCommerceSettings: async () => [{ key: "loyalty_accrual_enabled", value: "1" }] }
      if (key === Modules.CUSTOMER) return { retrieveCustomer: async () => ({ id: "cus_1", email: "vevo@example.hu", ...customer }) }
      if (key === "newsletter") return { listNewsletterSubscribers: async () => [] }
      if (key === LOYALTY_MODULE) return { grantBonus: grant }
      throw new Error(`unknown ${key}`)
    },
  }
  await customerCreatedLoyaltyBonus({ event: { data: id ? { id } : {} }, container } as never)
  return { grant }
}

describe("customerCreatedLoyaltyBonus", () => {
  it("listens to customer.created", () => {
    expect(config.event).toBe("customer.created")
  })

  it("a registration pays the sign-up bonus", async () => {
    const { grant } = await run({ has_account: true })
    expect(grant).toHaveBeenCalledWith({ customer_id: "cus_1", kind: "signup", points: 500 })
  })

  it("a guest checkout's customer record pays nothing", async () => {
    const { grant } = await run({ has_account: false })
    expect(grant).not.toHaveBeenCalled()
  })

  it("an event without a customer id does nothing", async () => {
    const { grant } = await run({ has_account: true }, undefined, "")
    expect(grant).not.toHaveBeenCalled()
  })

  it("a failing ledger does not throw out of the registration", async () => {
    await expect(run({ has_account: true }, jest.fn(async () => Promise.reject(new Error("db down"))) as never)).resolves.toBeDefined()
  })
})
