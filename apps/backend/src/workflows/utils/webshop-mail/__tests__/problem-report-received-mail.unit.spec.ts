const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { notifyProblemReportReceived } from "../problem-report-received-mail"

/*
  WHAT TURNS THIS RED (V1.2 slice 4, the acknowledgement mail). A text built by the shop (the OS renders it; Balázs,
  2026-10-05: no built-in fallback); the mail sent with the mail switch off, with the renderer off, or without an address;
  the facts carrying more than the order's number and the case reference (the text, the phone, the photos of the report);
  a mail to anyone but the order's own address; a failed send turning the filing into an error; an address or the
  error's text in the log; the idempotency key not one per report.
*/
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "id",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
  ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
} as NodeJS.ProcessEnv

const warnings: string[] = []
const container = {
  resolve: () => ({ warn: (message: string) => warnings.push(message) }),
} as never

const order = { id: "order_1", displayId: 1042, email: " vevo@example.hu " }

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyProblemReportReceived", () => {
  it("hands the OS the order's number and the case reference, to the order's own address, one key per report", async () => {
    const result = await notifyProblemReportReceived(container, { order, reportId: "ordprb_1" }, ON)
    expect(result).toEqual({ sent: true })
    expect(deliverShopMail).toHaveBeenCalledTimes(1)
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "problem-report-received",
      idempotency_key: "problem-report-received:ordprb_1",
      // the order's id: the outbox reads the language, the name and the time from it
      resource_id: "order_1",
    })
    expect(mail.render).toEqual({
      template: "problem-report-received",
      facts: { display_id: 1042, report_id: "ordprb_1" },
    })
  })

  it("carries no text of the shop's own: the content is empty, the OS renders", async () => {
    await notifyProblemReportReceived(container, { order, reportId: "ordprb_1" }, ON)
    expect(deliverShopMail.mock.calls[0][1].content).toEqual({ subject: "", text: "", html: "" })
  })

  it("sends nothing with the mail switch off", async () => {
    const result = await notifyProblemReportReceived(container, { order, reportId: "r" }, {})
    expect(result).toEqual({ sent: false, reason: "mail_off" })
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("sends nothing while the OS renderer is off: there is no built-in text to fall back to", async () => {
    for (const renderer of [undefined, "local", ""]) {
      const result = await notifyProblemReportReceived(
        container,
        { order, reportId: "r" },
        { ...ON, ACROPORA_WEBSHOP_MAIL_RENDERER: renderer } as NodeJS.ProcessEnv,
      )
      expect(result).toEqual({ sent: false, reason: "os_renderer_off" })
    }
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("sends nothing for an order without an address", async () => {
    const result = await notifyProblemReportReceived(container, { order: { ...order, email: null }, reportId: "r" }, ON)
    expect(result).toEqual({ sent: false, reason: "no_email" })
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("a mail the OS cannot render now is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "the OS is down" })
    expect(await notifyProblemReportReceived(container, { order, reportId: "r" }, ON)).toEqual({
      sent: false,
      reason: "queued",
    })
  })

  it("a failed send is a result and a log line, never an error, and the log has no address or message", async () => {
    deliverShopMail.mockRejectedValue(new TypeError("vevo@example.hu secret details"))
    const result = await notifyProblemReportReceived(container, { order, reportId: "ordprb_9" }, ON)
    expect(result).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("ordprb_9")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain("secret details")
  })
})
