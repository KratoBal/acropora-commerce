import type { LoadedOrder } from "../prepare"
import {
  paymentDelayedKey,
  preparePaymentDelayedMail,
  renderPaymentDelayedMail,
} from "../payment-delayed-mail"
import { notifyHoldReleased } from "../payment-notify"
import { AdminReleaseOrderPaymentHold } from "../../../../api/admin/order-payment/validators"
import middlewares from "../../../../api/middlewares"

/**
 * THE "CSÚSZIK" MAIL (brief, point 3; the plan, 2.4). What must fail: the mail
 * not saying the card was NOT charged and its hold released, or not in forint;
 * it promising a delivery day or when the bank shows the release; a mixed
 * cart's pickup order not named; the same release mailed twice; a mail on the
 * switched-off channel; a failed send thrown at the caller (the release stands).
 */
const NBSP = String.fromCharCode(0xa0)
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "a",
  GMAIL_WEBSHOP_CLIENT_SECRET: "b",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
}
const RELEASED_AT = "2026-10-05T19:00:00.000Z"

const rendeles = (over: Partial<LoadedOrder> = {}): LoadedOrder => ({
  id: "order_45",
  display_id: 45,
  email: "vevo@example.test",
  total: 22150,
  items: [{ title: "Hanna HI780-25", quantity: 2, total: 21000 }],
  shipping: [{ name: "Foxpost csomagautomata", amount: 1150 }],
  payment: "ONLINE_CARD",
  ...over,
})
const input = (over: Record<string, unknown> = {}) => ({
  orderId: "order_45",
  releasedAt: RELEASED_AT,
  amount: 22150,
  pickupDisplayId: null,
  ...over,
})
const deps = (order: LoadedOrder | null, sent = false) => ({
  loadOrder: jest.fn(async () => order),
  alreadySent: jest.fn(async () => sent),
})

describe("renderPaymentDelayedMail", () => {
  it("says the delivery is late, the card was not charged and its hold released, in forint", () => {
    const { subject, text, html } = renderPaymentDelayedMail(rendeles(), { amount: 22150, pickupDisplayId: null })
    expect(subject).toBe("Csúszik a rendelésed szállítása (#45)")
    expect(text).toContain("A kártyádat NEM terheltük meg.")
    expect(text).toContain(`A rendeléskor zárolt 22${NBSP}150 Ft zárolását feloldottuk`)
    expect(text).toContain("fizetési linket")
    expect(text).toContain("A csomagot a fizetés után indítjuk.")
    expect(text).toContain(`Hanna HI780-25 × 2: 21${NBSP}000 Ft`)
    expect(html).toContain("A kártyádat NEM terheltük meg.")
  })

  it("promises no day: neither the delivery's nor the bank's", () => {
    const { text } = renderPaymentDelayedMail(rendeles(), { amount: 22150, pickupDisplayId: 46 })
    expect(text).not.toMatch(/\d+\s*(nap|munkanap)|holnap|hétfő|kedd|szerda|csütörtök|péntek/i)
    expect(text).not.toMatch(/\b20\d\d\./)
  })

  it("a mixed cart names the pickup order: its hold was the same and is released too", () => {
    const { text } = renderPaymentDelayedMail(rendeles(), { amount: 21950, pickupDisplayId: 46 })
    expect(text).toContain("Rendelés: #45 és #46")
    expect(text).toContain("A bolti átvételes #46 rendelésed ugyanazzal a kártyás fizetéssel készült")
    expect(renderPaymentDelayedMail(rendeles(), { amount: 1, pickupDisplayId: null }).text).not.toContain("bolti átvételes")
  })

  it("escapes the catalogue's text in the HTML", () => {
    const { html } = renderPaymentDelayedMail(rendeles({ items: [{ title: "<b>x</b>", quantity: 1, total: 1 }] }), {
      amount: 1,
      pickupDisplayId: null,
    })
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;")
  })
})

describe("preparePaymentDelayedMail", () => {
  it("one mail per release, on its own key and template", async () => {
    const result = await preparePaymentDelayedMail(input(), deps(rendeles()), ON)
    expect(result).toMatchObject({
      status: "send",
      mail: {
        to: "vevo@example.test",
        template: "order-payment-delayed",
        idempotency_key: `order-payment-delayed:order_45:${RELEASED_AT}`,
        resource_id: "order_45",
      },
    })
    expect(paymentDelayedKey("order_45", RELEASED_AT)).toBe(`order-payment-delayed:order_45:${RELEASED_AT}`)
  })

  it("skips: switched off, already sent, no order, no email", async () => {
    expect(await preparePaymentDelayedMail(input(), deps(rendeles()), {})).toEqual({ status: "skip", reason: "mail_off" })
    expect(await preparePaymentDelayedMail(input(), deps(rendeles(), true), ON)).toEqual({
      status: "skip",
      reason: "already_sent",
    })
    expect(await preparePaymentDelayedMail(input(), deps(null), ON)).toEqual({ status: "skip", reason: "order_missing" })
    expect(await preparePaymentDelayedMail(input(), deps(rendeles({ email: " " })), ON)).toEqual({
      status: "skip",
      reason: "no_email",
    })
  })
})

describe("notifyHoldReleased", () => {
  it("a failed send is reported, not thrown: the release stands", async () => {
    const previous = { ...process.env }
    Object.assign(process.env, ON)
    const errors: string[] = []
    try {
      const container = {
        resolve: (key: string) => {
          if (key === "logger") return { error: (line: string) => errors.push(line) }
          throw new Error(`${key} down`)
        },
      }
      expect(await notifyHoldReleased(container as never, input() as never)).toEqual({ sent: false, reason: "failed" })
      expect(errors).toEqual(["Order order_45: the payment-delayed mail failed: notification down"])
    } finally {
      process.env = previous
    }
  })
})

describe("the release-hold body", () => {
  it("takes only notify_customer, and the route validates it", () => {
    expect(AdminReleaseOrderPaymentHold.safeParse({}).success).toBe(true)
    expect(AdminReleaseOrderPaymentHold.safeParse({ notify_customer: false }).success).toBe(true)
    expect(AdminReleaseOrderPaymentHold.safeParse({ notify_customer: "no" }).success).toBe(false)
    expect(AdminReleaseOrderPaymentHold.safeParse({ amount: 1 }).success).toBe(false)
    const route = (middlewares.routes ?? []).find((r) => r.matcher === "/admin/order-payment/:order_id/release-hold")
    expect(route?.methods).toEqual(["POST"])
    expect(route?.middlewares?.length).toBe(1)
  })
})
