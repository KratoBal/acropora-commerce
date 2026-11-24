const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { notifyPasswordReset, PASSWORD_RESET_VALID_MINUTES } from "../password-reset-mail"

/*
  WHAT TURNS THIS RED (card 7bfca4eb). A mail sent without its own switch (the text is not approved yet), with the mail switch or the
  renderer off, or without the storefront's https address (a link that goes nowhere); a text built by the shop (the OS renders it); the
  link not carrying the token, or pointing to another page or language; the lifetime not named (15 minutes, Medusa's fixed one); the common
  facts read from an order (there is none) or the name not the account's; the same key for two different tokens; an address or a token in
  the log.
*/
const ON = {
  ACROPORA_PASSWORD_RESET_MAIL: "on",
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "id",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
  ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
  ACROPORA_STOREFRONT_URL: "https://kirakat.example.test/valami?x=1",
} as NodeJS.ProcessEnv

const warnings: string[] = []
const container = {
  resolve: () => ({ warn: (message: string) => warnings.push(message) }),
} as never

const TOKEN = "eyJhbGciOi.reset.token+/="
const input = { customer_id: "cus_1", to: "vevo@example.hu", name: "Kiss Anna", language: "en", token: TOKEN }

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyPasswordReset", () => {
  it("PR-MAIL: hands the OS the link (token in the query, encoded) and the lifetime, with the account's own common facts", async () => {
    expect(await notifyPasswordReset(container, input, ON)).toEqual({ sent: true })
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "password-reset",
      resource_id: "cus_1",
      content: { subject: "", text: "", html: "" },
    })
    expect(mail.render).toEqual({
      template: "password-reset",
      facts: {
        // the English mails are off: Hungarian, whatever the request's language
        reset_url: `https://kirakat.example.test/hu/uj-jelszo?token=${encodeURIComponent(TOKEN)}`,
        valid_minutes: 15,
      },
    })
    expect(PASSWORD_RESET_VALID_MINUTES).toBe(15)
    expect(mail.common).toEqual({ customer_name: "Kiss Anna", order_created_at: null, locale: "hu", order_view_url: null })
  })

  it("PR-MAIL-EN: with the English mails on, the request's language picks the page and the mail's language; an unknown one is Hungarian", async () => {
    await notifyPasswordReset(container, input, { ...ON, ACROPORA_WEBSHOP_MAIL_ENGLISH: "on" } as NodeJS.ProcessEnv)
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail.common.locale).toBe("en")
    expect(mail.render.facts.reset_url).toBe(`https://kirakat.example.test/en-hu/uj-jelszo?token=${encodeURIComponent(TOKEN)}`)
    await notifyPasswordReset(container, { ...input, language: "de" }, { ...ON, ACROPORA_WEBSHOP_MAIL_ENGLISH: "on" } as NodeJS.ProcessEnv)
    expect(deliverShopMail.mock.calls[1][1].common.locale).toBe("hu")
  })

  it("PR-MAIL-KEY: a new token is a new mail; the same one keeps its key", async () => {
    await notifyPasswordReset(container, input, ON)
    await notifyPasswordReset(container, input, ON)
    await notifyPasswordReset(container, { ...input, token: "other.token" }, ON)
    const keys = deliverShopMail.mock.calls.map((call) => call[1].idempotency_key)
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
    expect(keys[0]).toMatch(/^password-reset:cus_1:[0-9a-f]{16}$/)
    expect(keys[0]).not.toContain(TOKEN)
  })

  it("PR-MAIL-OFF: nothing goes without its own switch, the mail switch, the OS renderer or the storefront's https address", async () => {
    const cases: [Record<string, string | undefined>, string][] = [
      [{ ACROPORA_PASSWORD_RESET_MAIL: undefined }, "switch_off"],
      [{ ACROPORA_PASSWORD_RESET_MAIL: "yes" }, "switch_off"],
      [{ ACROPORA_WEBSHOP_MAIL: undefined }, "mail_off"],
      [{ ACROPORA_WEBSHOP_MAIL_RENDERER: "local" }, "os_renderer_off"],
      [{ ACROPORA_STOREFRONT_URL: undefined }, "no_storefront_url"],
      [{ ACROPORA_STOREFRONT_URL: "http://kirakat.example.test" }, "no_storefront_url"],
    ]
    for (const [over, reason] of cases) {
      const result = await notifyPasswordReset(container, input, { ...ON, ...over } as NodeJS.ProcessEnv)
      expect([over, result]).toEqual([over, { sent: false, reason }])
    }
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("PR-MAIL-QUEUED: a mail the OS cannot render now is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "the OS is down" })
    expect(await notifyPasswordReset(container, input, ON)).toEqual({ sent: false, reason: "queued" })
  })

  it("PR-MAIL-NO-NAME: an account without a name is sent with a null name, not a made-up one", async () => {
    await notifyPasswordReset(container, { ...input, name: null }, ON)
    expect(deliverShopMail.mock.calls[0][1].common.customer_name).toBeNull()
  })

  it("PR-MAIL-FAIL: a failed send is a result and a log line, never an error; the log has no address and no token", async () => {
    deliverShopMail.mockRejectedValue(new TypeError(`vevo@example.hu ${TOKEN}`))
    expect(await notifyPasswordReset(container, input, ON)).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("cus_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain(TOKEN)
  })
})
