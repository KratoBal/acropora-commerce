import type { LoadedOrder } from "../prepare"
import { deadlineDay, preparePaymentLinkMail, renderPaymentLinkMail } from "../payment-link-mail"

/**
 * THE PAYMENT LINK'S MAIL (plan 2.4). What must fail: the amount not the
 * link's (a mixed cart's two orders together), or not in forint; the link
 * missing from the text or the button; the deadline not the shop's calendar
 * day; a mixed cart's pickup order not listed; the same link mailed twice; a
 * mail on the switched-off channel.
 */
const NBSP = String.fromCharCode(0xa0)
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "a",
  GMAIL_WEBSHOP_CLIENT_SECRET: "b",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
}
const URL = "https://shop.example.test/hu/rendeles-fizetese/abc.def"

const rendeles = (over: Partial<LoadedOrder> = {}): LoadedOrder => ({
  id: "order_45",
  display_id: 45,
  email: "vevo@example.test",
  total: 4950,
  items: [{ title: "Hanna HI780-25", quantity: 1, total: 3800 }],
  shipping: [{ name: "Foxpost csomagautomata", amount: 1150 }],
  payment: "ONLINE_CARD",
  ...over,
})
const pickup = rendeles({ id: "order_46", display_id: 46, total: 17000, items: [{ title: "Bohóchal", quantity: 1, total: 17000 }], shipping: [] })

describe("renderPaymentLinkMail", () => {
  it("the amount, the link as text and as the button, the deadline as a day", () => {
    const { subject, text, html } = renderPaymentLinkMail(rendeles(), {
      url: URL,
      // 22:30 UTC is already the next day in Budapest (CEST, +2)
      expiresAt: "2026-10-11T22:30:00.000Z",
      amount: 4950,
      pickup: null,
    })
    expect(subject).toBe("Kifizetheted a rendelésedet (#45)")
    expect(text).toContain(`FIZETENDŐ: 4${NBSP}950 Ft`)
    expect(text).toContain(`Fizetés: ${URL}`)
    expect(html).toContain(`href="${URL}"`)
    expect(text).toContain("A link 2026. október 12. végéig érvényes.")
    expect(text).toContain("a csomagot a fizetés után indítjuk")
  })

  it("a mixed cart: one amount for both, the pickup order listed", () => {
    const { text } = renderPaymentLinkMail(rendeles(), { url: URL, expiresAt: "2026-10-11T10:00:00.000Z", amount: 21950, pickup })
    expect(text).toContain("Rendelés: #45 és #46")
    expect(text).toContain(`FIZETENDŐ: 21${NBSP}950 Ft`)
    expect(text).toContain("Bolti átvételes rendelésed (#46):")
    expect(text).toContain(`Bohóchal × 1: 17${NBSP}000 Ft`)
  })

  it("the deadline's day is Budapest's", () => {
    expect(deadlineDay("2026-10-11T21:59:00.000Z")).toBe("2026. október 11.")
    expect(deadlineDay("2026-10-11T22:00:00.000Z")).toBe("2026. október 12.")
  })
})

describe("preparePaymentLinkMail", () => {
  const input = { orderId: "order_45", sentAt: "2026-10-06T10:00:00.000Z", url: URL, expiresAt: "2026-10-12T10:00:00.000Z", amount: 4950, pickup: null }
  const deps = (order: LoadedOrder | null, sent = false) => ({ loadOrder: async () => order, alreadySent: async () => sent })

  it("one mail per link, on its own key", async () => {
    expect(await preparePaymentLinkMail(input, deps(rendeles()), ON)).toMatchObject({
      status: "send",
      mail: { template: "order-payment-link", idempotency_key: "order-payment-link:order_45:2026-10-06T10:00:00.000Z" },
    })
  })

  it("skips: switched off, already sent, no order, no email", async () => {
    expect(await preparePaymentLinkMail(input, deps(rendeles()), {})).toEqual({ status: "skip", reason: "mail_off" })
    expect(await preparePaymentLinkMail(input, deps(rendeles(), true), ON)).toEqual({ status: "skip", reason: "already_sent" })
    expect(await preparePaymentLinkMail(input, deps(null), ON)).toEqual({ status: "skip", reason: "order_missing" })
    expect(await preparePaymentLinkMail(input, deps(rendeles({ email: null })), ON)).toEqual({ status: "skip", reason: "no_email" })
  })
})
