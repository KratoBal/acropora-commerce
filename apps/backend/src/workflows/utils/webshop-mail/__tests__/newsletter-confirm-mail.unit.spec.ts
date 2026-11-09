const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { newsletterTokenHash } from "../../../../modules/newsletter/double-opt-in"
import { notifyNewsletterConfirm } from "../newsletter-confirm-mail"

/*
  WHAT TURNS THIS RED (double opt-in, card d707cf5f). A mail sent without its own switch (the text and the seven days
  are not approved yet), with the mail switch or the renderer off, or without the storefront's https address (a link
  that goes nowhere); a text built by the shop (the OS renders it); the links not carrying the tokens, or pointing
  to another page or language; the link's end not seven days from the sign-up; the common facts read from an order
  (there is none); the same key for two different confirmation tokens; an address or a token in the log.
*/
const ON = {
  ACROPORA_NEWSLETTER_CONFIRM_MAIL: "on",
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

const CONFIRM = "c".repeat(43)
const LEAVE = "u".repeat(43)
const input = {
  id: "nlsub_1",
  to: "vevo@example.hu",
  name: "Kiss Anna",
  language: "en",
  confirmation_token: CONFIRM,
  unsubscribe_token: LEAVE,
  sent_at: new Date("2026-11-09T15:00:00.000Z"),
}

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyNewsletterConfirm", () => {
  it("NL-MAIL: hands the OS the two links and the link's end, with the sign-up's own common facts", async () => {
    expect(await notifyNewsletterConfirm(container, input, ON)).toEqual({ sent: true })
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "newsletter-confirm",
      idempotency_key: `newsletter-confirm:nlsub_1:${newsletterTokenHash(CONFIRM).slice(0, 16)}`,
      resource_id: "nlsub_1",
      content: { subject: "", text: "", html: "" },
    })
    expect(mail.render).toEqual({
      template: "newsletter-confirm",
      facts: {
        // the English mails are off: Hungarian, whatever the form's language
        confirm_url: `https://kirakat.example.test/hu/hirlevel/megerosites?token=${CONFIRM}`,
        unsubscribe_url: `https://kirakat.example.test/hu/hirlevel/leiratkozas?token=${LEAVE}`,
        expires_at: "2026-11-16T15:00:00.000Z",
      },
    })
    expect(mail.common).toEqual({ customer_name: "Kiss Anna", order_created_at: null, locale: "hu", order_view_url: null })
  })

  it("NL-MAIL-EN: with the English mails on, the form's language picks the pages and the mail's language", async () => {
    await notifyNewsletterConfirm(container, input, { ...ON, ACROPORA_WEBSHOP_MAIL_ENGLISH: "on" } as NodeJS.ProcessEnv)
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail.common.locale).toBe("en")
    expect(mail.render.facts.confirm_url).toBe(`https://kirakat.example.test/en-hu/hirlevel/megerosites?token=${CONFIRM}`)
    // an unknown language is Hungarian
    await notifyNewsletterConfirm(container, { ...input, language: "de" }, { ...ON, ACROPORA_WEBSHOP_MAIL_ENGLISH: "on" } as NodeJS.ProcessEnv)
    expect(deliverShopMail.mock.calls[1][1].common.locale).toBe("hu")
  })

  it("NL-MAIL-KEY: a new confirmation token is a new mail; the same one keeps its key", async () => {
    await notifyNewsletterConfirm(container, input, ON)
    await notifyNewsletterConfirm(container, input, ON)
    await notifyNewsletterConfirm(container, { ...input, confirmation_token: "d".repeat(43) }, ON)
    const keys = deliverShopMail.mock.calls.map((call) => call[1].idempotency_key)
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
  })

  it("NL-MAIL-OFF: nothing goes without its own switch, the mail switch, the OS renderer or the storefront's https address", async () => {
    const cases: [Record<string, string | undefined>, string][] = [
      [{ ACROPORA_NEWSLETTER_CONFIRM_MAIL: undefined }, "switch_off"],
      [{ ACROPORA_NEWSLETTER_CONFIRM_MAIL: "yes" }, "switch_off"],
      [{ ACROPORA_WEBSHOP_MAIL: undefined }, "mail_off"],
      [{ ACROPORA_WEBSHOP_MAIL_RENDERER: "local" }, "os_renderer_off"],
      [{ ACROPORA_STOREFRONT_URL: undefined }, "no_storefront_url"],
      [{ ACROPORA_STOREFRONT_URL: "http://kirakat.example.test" }, "no_storefront_url"],
    ]
    for (const [over, reason] of cases) {
      const result = await notifyNewsletterConfirm(container, input, { ...ON, ...over } as NodeJS.ProcessEnv)
      expect([over, result]).toEqual([over, { sent: false, reason }])
    }
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("NL-MAIL-QUEUED: a mail the OS cannot render now is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "the OS is down" })
    expect(await notifyNewsletterConfirm(container, input, ON)).toEqual({ sent: false, reason: "queued" })
  })

  it("NL-MAIL-FAIL: a failed send is a result and a log line, never an error; the log has no address and no token", async () => {
    deliverShopMail.mockRejectedValue(new TypeError(`vevo@example.hu ${CONFIRM}`))
    expect(await notifyNewsletterConfirm(container, input, ON)).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("nlsub_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain(CONFIRM)
  })
})
