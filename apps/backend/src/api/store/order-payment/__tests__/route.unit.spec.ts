import { GET } from "../[token]/route"
import { POST as SESSION } from "../[token]/session/route"
import { POST as COMPLETE } from "../[token]/complete/route"
import { POST as SEND_LINK } from "../../../admin/order-payment/[order_id]/payment-link/route"
import { completeLinkPayment, resolvePaymentLink, startLinkSession } from "../../../../workflows/utils/order-payment/pay-by-link"
import { sendPaymentLink } from "../../../../workflows/utils/order-payment/payment-link"
import { notifyPaymentLink } from "../../../../workflows/utils/webshop-mail/payment-notify"
import middlewares from "../../../middlewares"

jest.mock("../../../../workflows/utils/order-payment/operations", () => ({
  payByLinkOperations: jest.fn(() => "pay-ops"),
  paymentLinkOperations: jest.fn(() => "link-ops"),
}))
jest.mock("../../../../workflows/utils/order-payment/pay-by-link", () => ({
  resolvePaymentLink: jest.fn(),
  startLinkSession: jest.fn(async () => ({ client_secret: "cs", amount: 9800 })),
  completeLinkPayment: jest.fn(async () => ({ state: "paid", paid_at: "2026-10-07T10:00:00.000Z" })),
}))
jest.mock("../../../../workflows/utils/order-payment/payment-link", () => ({ sendPaymentLink: jest.fn() }))
jest.mock("../../../../workflows/utils/webshop-mail/payment-notify", () => ({
  notifyPaymentLink: jest.fn(async () => ({ sent: true })),
}))
jest.mock("../../../../workflows/utils/webshop-mail/operations", () => ({
  orderMailOperations: () => ({
    loadOrder: async (id: string) => ({
      id,
      display_id: id === "order_1" ? 48 : 49,
      email: "vevo@example.test",
      total: 9800,
      items: [{ title: "Hanna", quantity: 1, total: 8650 }],
      shipping: [{ name: "Foxpost", amount: 1150 }],
      payment: "ONLINE_CARD",
    }),
  }),
}))

/**
 * THE LINK'S ROUTES. What must fail: a route answering without the link's
 * settings (a link signed with nothing); the payment page's summary carrying
 * the customer's e-mail or ids; an unsigned token answering 200; the admin's
 * mail going when "Vevő értesítése" is unticked, or from the pickup half.
 */
const SETTINGS = {
  ACROPORA_PAYMENT_LINK_SECRET: "teszt-titok-legalabb-harminckettő-karakter",
  ACROPORA_STOREFRONT_URL: "https://shop.example.test",
}
const previous = { ...process.env }
beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...previous, ...SETTINGS }
})
afterAll(() => {
  process.env = previous
})

const respond = () => {
  const sent: unknown[] = []
  return { sent, res: { json: (body: unknown) => void sent.push(body) } }
}
const req = (extra: Record<string, unknown> = {}) => ({ params: { token: "t.s", order_id: "order_1" }, scope: "scope", ...extra })

describe("the store's payment link routes", () => {
  it("the summary: state, amount, deadline and the orders' lines, no e-mail", async () => {
    ;(resolvePaymentLink as jest.Mock).mockResolvedValue({
      state: "open",
      payload: { order_id: "order_1", collection_id: "c", amount: 9800, expires_at: Date.parse("2026-10-12T10:00:00.000Z") },
      pair: { primary: { order_id: "order_1" }, pickup: null },
      stored: null,
    })
    const { sent, res } = respond()
    await GET(req() as never, res as never)
    expect(sent).toEqual([
      {
        state: "open",
        amount: 9800,
        currency_code: "huf",
        expires_at: "2026-10-12T10:00:00.000Z",
        paid_at: null,
        orders: [
          { display_id: 48, items: [{ title: "Hanna", quantity: 1, total: 8650 }], shipping: [{ name: "Foxpost", amount: 1150 }], total: 9800 },
        ],
      },
    ])
    expect(JSON.stringify(sent)).not.toMatch(/example\.test|order_1/)
  })

  it("an unsigned token is a 404", async () => {
    ;(resolvePaymentLink as jest.Mock).mockResolvedValue(null)
    await expect(GET(req() as never, respond().res as never)).rejects.toMatchObject({ type: "not_found" })
  })

  it("session and complete pass the token and the secret on", async () => {
    const session = respond()
    await SESSION(req() as never, session.res as never)
    expect(startLinkSession).toHaveBeenCalledWith("t.s", "pay-ops", SETTINGS.ACROPORA_PAYMENT_LINK_SECRET)
    expect(session.sent).toEqual([{ client_secret: "cs", amount: 9800 }])
    const complete = respond()
    await COMPLETE(req() as never, complete.res as never)
    expect(completeLinkPayment).toHaveBeenCalledWith("t.s", "pay-ops", SETTINGS.ACROPORA_PAYMENT_LINK_SECRET)
    expect(complete.sent).toEqual([{ state: "paid", paid_at: "2026-10-07T10:00:00.000Z" }])
  })

  it("without the link's settings nothing answers", async () => {
    process.env = { ...previous, ACROPORA_PAYMENT_LINK_SECRET: "" }
    for (const route of [GET, SESSION, COMPLETE]) {
      await expect(route(req() as never, respond().res as never)).rejects.toThrow(/nincs beállítva/)
    }
    expect(resolvePaymentLink).not.toHaveBeenCalled()
  })

  it("the POSTs validate their body", () => {
    for (const matcher of [
      "/store/order-payment/:token/session",
      "/store/order-payment/:token/complete",
      "/admin/order-payment/:order_id/payment-link",
    ]) {
      const route = (middlewares.routes ?? []).find((r) => r.matcher === matcher)
      expect(route?.methods).toEqual(["POST"])
      expect(route?.middlewares?.length).toBe(1)
    }
  })
})

describe("POST /admin/order-payment/:order_id/payment-link", () => {
  const sent = {
    state: "link_sent",
    link: { url: "https://shop.example.test/hu/rendeles-fizetese/t.s", expires_at: "2026-10-12T10:00:00.000Z", amount: 21950 },
    sent_at: "2026-10-06T10:00:00.000Z",
    orders: [
      { order_id: "order_ship", display_id: 45, amount: 4950 },
      { order_id: "order_pick", display_id: 46, amount: 17000 },
    ],
  }

  it("sends the link and mails it from the shipped half, naming the pickup one", async () => {
    ;(sendPaymentLink as jest.Mock).mockResolvedValue(sent)
    const { sent: answer, res } = respond()
    await SEND_LINK(req({ validatedBody: {} }) as never, res as never)
    expect(answer).toEqual([{ state: "link_sent", link: sent.link, notification: { sent: true }, orders: sent.orders }])
    expect(notifyPaymentLink).toHaveBeenCalledWith("scope", {
      orderId: "order_ship",
      pickupOrderId: "order_pick",
      sentAt: sent.sent_at,
      url: sent.link.url,
      expiresAt: sent.link.expires_at,
      amount: 21950,
    })
  })

  it("an unticked \"Vevő értesítése\" sends the link without a mail", async () => {
    ;(sendPaymentLink as jest.Mock).mockResolvedValue(sent)
    const { sent: answer, res } = respond()
    await SEND_LINK(req({ validatedBody: { notify_customer: false } }) as never, res as never)
    expect(answer[0]).toMatchObject({ notification: { sent: false, reason: "not_requested" } })
    expect(notifyPaymentLink).not.toHaveBeenCalled()
  })
})
