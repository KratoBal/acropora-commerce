const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { newsletterTokenHash } from "../../../../modules/newsletter/double-opt-in"
import { notifyStockAlertConfirm } from "../stock-alert-confirm-mail"

/*
  WHAT TURNS THIS RED ("Szólj, ha jön hasonló", V2.4, card 0c1265d2). A mail sent without the stock alert's switch (the
  texts are not approved), with the mail switch or the renderer off, or without the storefront's https address; a text
  built by the shop (the OS renders it); the links not carrying the tokens, or pointing to the newsletter's pages; the
  link's end not seven days from the sign-up; the subject missing from the facts; an English page or mail (there is
  no English shop for this); the same key for two confirmation tokens; an address or a token in the log.
*/
const ON = {
  ACROPORA_STOCK_ALERT: "on",
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "id",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
  ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
  ACROPORA_WEBSHOP_MAIL_ENGLISH: "on",
  ACROPORA_STOREFRONT_URL: "https://kirakat.example.test/valami?x=1",
} as NodeJS.ProcessEnv

const warnings: string[] = []
const container = {
  resolve: () => ({ warn: (message: string) => warnings.push(message) }),
} as never

const CONFIRM = "c".repeat(43)
const LEAVE = "u".repeat(43)
const input = {
  id: "stkal_1",
  to: "vevo@example.hu",
  subject_label: "Acropora abrolhosensis",
  confirmation_token: CONFIRM,
  unsubscribe_token: LEAVE,
  sent_at: new Date("2026-11-09T15:00:00.000Z"),
}

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyStockAlertConfirm", () => {
  it("SA-MAIL: hands the OS the two links, the link's end and the subject, Hungarian, with no name and no order", async () => {
    expect(await notifyStockAlertConfirm(container, input, ON)).toEqual({ sent: true })
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "stock-alert-confirm",
      idempotency_key: `stock-alert-confirm:stkal_1:${newsletterTokenHash(CONFIRM).slice(0, 16)}`,
      resource_id: "stkal_1",
      content: { subject: "", text: "", html: "" },
    })
    expect(mail.render).toEqual({
      template: "stock-alert-confirm",
      facts: {
        // Hungarian pages even with the English mails on: there is no English form for this
        confirm_url: `https://kirakat.example.test/hu/ertesites/megerosites?token=${CONFIRM}`,
        unsubscribe_url: `https://kirakat.example.test/hu/ertesites/leiratkozas?token=${LEAVE}`,
        expires_at: "2026-11-16T15:00:00.000Z",
        subject_label: "Acropora abrolhosensis",
      },
    })
    expect(mail.common).toEqual({ customer_name: null, order_created_at: null, locale: "hu", order_view_url: null })
  })

  it("SA-MAIL-KEY: a new confirmation token is a new mail; the same one keeps its key", async () => {
    await notifyStockAlertConfirm(container, input, ON)
    await notifyStockAlertConfirm(container, input, ON)
    await notifyStockAlertConfirm(container, { ...input, confirmation_token: "d".repeat(43) }, ON)
    const keys = deliverShopMail.mock.calls.map((call) => call[1].idempotency_key)
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
  })

  it("SA-MAIL-OFF: nothing goes without the stock alert's switch, the mail switch, the OS renderer or the storefront's https address", async () => {
    const cases: [Record<string, string | undefined>, string][] = [
      [{ ACROPORA_STOCK_ALERT: undefined }, "switch_off"],
      [{ ACROPORA_STOCK_ALERT: "yes" }, "switch_off"],
      // the newsletter's switch is not this one
      [{ ACROPORA_STOCK_ALERT: undefined, ACROPORA_NEWSLETTER_CONFIRM_MAIL: "on" }, "switch_off"],
      [{ ACROPORA_WEBSHOP_MAIL: undefined }, "mail_off"],
      [{ ACROPORA_WEBSHOP_MAIL_RENDERER: "local" }, "os_renderer_off"],
      [{ ACROPORA_STOREFRONT_URL: undefined }, "no_storefront_url"],
      [{ ACROPORA_STOREFRONT_URL: "http://kirakat.example.test" }, "no_storefront_url"],
    ]
    for (const [over, reason] of cases) {
      const result = await notifyStockAlertConfirm(container, input, { ...ON, ...over } as NodeJS.ProcessEnv)
      expect([over, result]).toEqual([over, { sent: false, reason }])
    }
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("SA-MAIL-QUEUED: a mail the OS cannot render now (an OS without the template answers 422) is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "422" })
    expect(await notifyStockAlertConfirm(container, input, ON)).toEqual({ sent: false, reason: "queued" })
  })

  it("SA-MAIL-FAIL: a failed send is a result and a log line, never an error; the log has no address and no token", async () => {
    deliverShopMail.mockRejectedValue(new TypeError(`vevo@example.hu ${CONFIRM}`))
    expect(await notifyStockAlertConfirm(container, input, ON)).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("stkal_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain(CONFIRM)
  })
})
