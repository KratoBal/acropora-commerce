const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { notifyStockAlertArrival, stockAlertArrivalReady } from "../stock-alert-arrival-mail"

/*
  WHAT TURNS THIS RED ("Szólj, ha jön hasonló", V2.4, card 0c1265d2). An arrival mail sent without the stock alert's
  switch, the mail switch, the OS renderer or the storefront's https address; a text built by the shop; the product's
  page or the leaving link wrong (another path, no token, the handle not encoded); the language not following the form
  with the English mails on; a second key for the same wait, or the same key for a new one; an address or a token in
  the log.
*/
const ON = {
  ACROPORA_STOCK_ALERT: "on",
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

const LEAVE = "u".repeat(43)
const CONFIRMED = new Date("2026-11-09T15:00:00.000Z")
const input = {
  id: "stkal_1",
  to: "vevo@example.hu",
  subject_label: "Acropora abrolhosensis",
  language: "en",
  unsubscribe_token: LEAVE,
  confirmed_at: CONFIRMED,
  product: { title: "Acropora abrolhosensis ULTRA", handle: "acropora-abrolhosensis-ultra/2" },
}

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyStockAlertArrival", () => {
  it("SA-ARRMAIL: hands the OS what was waited for, the piece, its page and the leaving link, with no name and no order", async () => {
    expect(await notifyStockAlertArrival(container, input, ON)).toEqual({ sent: true })
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "stock-alert-arrival",
      idempotency_key: `stock-alert-arrival:stkal_1:${CONFIRMED.getTime()}`,
      resource_id: "stkal_1",
      content: { subject: "", text: "", html: "" },
    })
    expect(mail.render).toEqual({
      template: "stock-alert-arrival",
      facts: {
        // the English mails are off: Hungarian, whatever the form's language
        subject_label: "Acropora abrolhosensis",
        product_title: "Acropora abrolhosensis ULTRA",
        product_url: "https://kirakat.example.test/hu/termek/acropora-abrolhosensis-ultra%2F2",
        unsubscribe_url: `https://kirakat.example.test/hu/ertesites/leiratkozas?token=${LEAVE}`,
      },
    })
    expect(mail.common).toEqual({ customer_name: null, order_created_at: null, locale: "hu", order_view_url: null })
  })

  it("SA-ARRMAIL-EN: with the English mails on, the form's language picks the pages and the mail's language", async () => {
    await notifyStockAlertArrival(container, input, { ...ON, ACROPORA_WEBSHOP_MAIL_ENGLISH: "on" } as NodeJS.ProcessEnv)
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail.common.locale).toBe("en")
    expect(mail.render.facts.product_url).toBe("https://kirakat.example.test/en-hu/termek/acropora-abrolhosensis-ultra%2F2")
    expect(mail.render.facts.unsubscribe_url).toBe(`https://kirakat.example.test/en-hu/ertesites/leiratkozas?token=${LEAVE}`)
  })

  it("SA-ARRMAIL-KEY: the same wait keeps its key whatever piece is named; a new confirmation is a new mail", async () => {
    await notifyStockAlertArrival(container, input, ON)
    await notifyStockAlertArrival(container, { ...input, product: { title: "Más", handle: "mas" } }, ON)
    await notifyStockAlertArrival(container, { ...input, confirmed_at: "2026-11-10T08:00:00.000Z" }, ON)
    const keys = deliverShopMail.mock.calls.map((call) => call[1].idempotency_key)
    expect(keys[1]).toBe(keys[0])
    expect(keys[2]).not.toBe(keys[0])
  })

  it("SA-ARRMAIL-OFF: nothing goes, and the job reads nothing, without every switch and the storefront's https address", async () => {
    const cases: Record<string, string | undefined>[] = [
      { ACROPORA_STOCK_ALERT: undefined },
      { ACROPORA_STOCK_ALERT: "yes" },
      { ACROPORA_WEBSHOP_MAIL: undefined },
      { ACROPORA_WEBSHOP_MAIL_RENDERER: "local" },
      { ACROPORA_STOREFRONT_URL: undefined },
      { ACROPORA_STOREFRONT_URL: "http://kirakat.example.test" },
    ]
    for (const over of cases) {
      const env = { ...ON, ...over } as NodeJS.ProcessEnv
      expect([over, stockAlertArrivalReady(env), await notifyStockAlertArrival(container, input, env)]).toEqual([
        over,
        false,
        { sent: false, reason: "not_ready" },
      ])
    }
    expect(stockAlertArrivalReady(ON)).toBe(true)
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("SA-ARRMAIL-QUEUED: a mail the OS cannot render now is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "422" })
    expect(await notifyStockAlertArrival(container, input, ON)).toEqual({ sent: false, reason: "queued" })
  })

  it("SA-ARRMAIL-FAIL: a failed send is a result and a log line, never an error; the log has no address and no token", async () => {
    deliverShopMail.mockRejectedValue(new TypeError(`vevo@example.hu ${LEAVE}`))
    expect(await notifyStockAlertArrival(container, input, ON)).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("stkal_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain(LEAVE)
  })
})
