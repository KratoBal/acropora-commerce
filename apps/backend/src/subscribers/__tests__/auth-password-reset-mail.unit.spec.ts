const notifyPasswordReset = jest.fn()
jest.mock("../../workflows/utils/webshop-mail/password-reset-mail", () => ({
  notifyPasswordReset: (...args: unknown[]) => notifyPasswordReset(...args),
}))

import { Modules } from "@medusajs/framework/utils"

import authPasswordResetMail, { config } from "../auth-password-reset-mail"

/*
  WHAT TURNS THIS RED (card 7bfca4eb): the subscriber not listening to auth.password_reset; a mail for an ADMIN reset (actor_type user);
  a mail to an address with no account, or to a guest checkout's customer record (has_account false: it has no password, and a mail to a
  stranger is spam); the request's language ignored; the name not the account's "Vezetéknév Keresztnév"; a customer lookup failure throwing
  out of the event instead of a log line without address or token.
*/
const warnings: string[] = []
const make = (rows: unknown[] | Error) => {
  const lookups: unknown[] = []
  const container = {
    resolve: (key: string) => {
      if (key === "logger") return { warn: (m: string) => warnings.push(m) }
      if (key === Modules.CUSTOMER)
        return {
          listCustomers: async (filters: unknown) => {
            lookups.push(filters)
            if (rows instanceof Error) throw rows
            return rows
          },
        }
      throw new Error(`unknown ${key}`)
    },
  }
  return { container, lookups }
}
const run = async (data: Record<string, unknown>, rows: unknown[] | Error = [{ id: "cus_1", email: "vevo@example.hu", first_name: "Anna", last_name: "Kiss" }]) => {
  const { container, lookups } = make(rows)
  await authPasswordResetMail({ event: { data }, container } as never)
  return { lookups }
}

beforeEach(() => {
  notifyPasswordReset.mockReset()
  warnings.length = 0
})

describe("authPasswordResetMail", () => {
  it("listens to auth.password_reset", () => {
    expect(config.event).toBe("auth.password_reset")
  })

  it("a customer's request mails the account: the id, the address, the name 'Vezetéknév Keresztnév', the token", async () => {
    const { lookups } = await run({ entity_id: " Vevo@Example.hu ", actor_type: "customer", token: "tok" })
    expect(lookups).toEqual([{ email: "vevo@example.hu", has_account: true }])
    expect(notifyPasswordReset).toHaveBeenCalledWith(expect.anything(), {
      customer_id: "cus_1",
      to: "vevo@example.hu",
      name: "Kiss Anna",
      language: "hu",
      token: "tok",
    })
  })

  it("the request's language rides in the metadata; none is Hungarian", async () => {
    await run({ entity_id: "vevo@example.hu", actor_type: "customer", token: "tok", metadata: { locale: "en" } })
    expect(notifyPasswordReset.mock.calls[0][1].language).toBe("en")
  })

  it("an account without a name mails with a null name", async () => {
    await run({ entity_id: "vevo@example.hu", actor_type: "customer", token: "tok" }, [{ id: "cus_1", email: "vevo@example.hu", first_name: null, last_name: null }])
    expect(notifyPasswordReset.mock.calls[0][1].name).toBeNull()
  })

  it("an address with no account (or only a guest record) mails nobody", async () => {
    await run({ entity_id: "vendeg@example.hu", actor_type: "customer", token: "tok" }, [])
    expect(notifyPasswordReset).not.toHaveBeenCalled()
  })

  it("an admin reset (actor_type user), a missing token or a missing address does nothing", async () => {
    for (const data of [
      { entity_id: "a@acropora.hu", actor_type: "user", token: "tok" },
      { entity_id: "vevo@example.hu", actor_type: "customer" },
      { actor_type: "customer", token: "tok" },
      {},
    ]) {
      const { lookups } = await run(data)
      expect(lookups).toEqual([])
    }
    expect(notifyPasswordReset).not.toHaveBeenCalled()
  })

  it("a failing customer lookup does not throw out of the event, and the log has no address and no token", async () => {
    await run({ entity_id: "vevo@example.hu", actor_type: "customer", token: "secret-token" }, new TypeError("vevo@example.hu secret-token"))
    expect(notifyPasswordReset).not.toHaveBeenCalled()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain("secret-token")
  })
})
