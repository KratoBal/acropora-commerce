const deliverShopMail = jest.fn()
jest.mock("../deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))

import { notifyWithdrawalReceived } from "../withdrawal-received-mail"

/*
  WHAT TURNS THIS RED (V0.3 slice 2, the withdrawal acknowledgement mail). A text built by the shop (the OS renders it;
  Balázs, 2026-10-05: no built-in fallback); the mail sent with the mail switch off, with the renderer off, or without an
  address; the facts losing the declared name, the lines or the time of receipt, or carrying more than that; a mail to
  anyone but the order's own address; a failed send turning the recording into an error; an address, a name or the
  error's text in the log; the idempotency key not one per declaration.
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
const input = {
  order,
  withdrawalId: "ordwdr_1",
  declaredName: "Kiss Anna",
  itemIds: ["item_1", "item_2"],
  receivedAt: "2026-11-05T18:00:00.000Z",
}

beforeEach(() => {
  deliverShopMail.mockReset()
  deliverShopMail.mockResolvedValue({ sent: true })
  warnings.length = 0
})

describe("notifyWithdrawalReceived", () => {
  it("hands the OS the declaration's facts, to the order's own address, one key per declaration", async () => {
    const result = await notifyWithdrawalReceived(container, input, ON)
    expect(result).toEqual({ sent: true })
    expect(deliverShopMail).toHaveBeenCalledTimes(1)
    const mail = deliverShopMail.mock.calls[0][1]
    expect(mail).toMatchObject({
      to: "vevo@example.hu",
      template: "withdrawal-received",
      idempotency_key: "withdrawal-received:ordwdr_1",
      resource_id: "order_1",
    })
    expect(mail.render).toEqual({
      template: "withdrawal-received",
      facts: {
        display_id: 1042,
        withdrawal_id: "ordwdr_1",
        declared_name: "Kiss Anna",
        item_ids: ["item_1", "item_2"],
        received_at: "2026-11-05T18:00:00.000Z",
      },
    })
  })

  it("carries the lines' titles in the facts when it has them, and no key when it has none", async () => {
    await notifyWithdrawalReceived(container, { ...input, itemTitles: ["Kék korall", "Tengeri só (20 kg)"] }, ON)
    expect(deliverShopMail.mock.calls[0][1].render.facts).toEqual({
      display_id: 1042,
      withdrawal_id: "ordwdr_1",
      declared_name: "Kiss Anna",
      item_ids: ["item_1", "item_2"],
      item_titles: ["Kék korall", "Tengeri só (20 kg)"],
      received_at: "2026-11-05T18:00:00.000Z",
    })
    for (const itemTitles of [undefined, []]) {
      deliverShopMail.mockClear()
      await notifyWithdrawalReceived(container, { ...input, itemTitles }, ON)
      expect(deliverShopMail.mock.calls[0][1].render.facts).not.toHaveProperty("item_titles")
    }
  })

  it("carries no text of the shop's own: the content is empty, the OS renders", async () => {
    await notifyWithdrawalReceived(container, input, ON)
    expect(deliverShopMail.mock.calls[0][1].content).toEqual({ subject: "", text: "", html: "" })
  })

  it("sends nothing with the mail switch off", async () => {
    expect(await notifyWithdrawalReceived(container, input, {})).toEqual({ sent: false, reason: "mail_off" })
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("sends nothing while the OS renderer is off: there is no built-in text to fall back to", async () => {
    for (const renderer of [undefined, "local", ""]) {
      const result = await notifyWithdrawalReceived(container, input, {
        ...ON,
        ACROPORA_WEBSHOP_MAIL_RENDERER: renderer,
      } as NodeJS.ProcessEnv)
      expect(result).toEqual({ sent: false, reason: "os_renderer_off" })
    }
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("sends nothing for an order without an address", async () => {
    const result = await notifyWithdrawalReceived(container, { ...input, order: { ...order, email: null } }, ON)
    expect(result).toEqual({ sent: false, reason: "no_email" })
    expect(deliverShopMail).not.toHaveBeenCalled()
  })

  it("a mail the OS cannot render now is queued, not a failure", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "the OS is down" })
    expect(await notifyWithdrawalReceived(container, input, ON)).toEqual({ sent: false, reason: "queued" })
  })

  it("a failed send is a result and a log line, never an error, and the log has no address, name or message", async () => {
    deliverShopMail.mockRejectedValue(new TypeError("vevo@example.hu secret details"))
    const result = await notifyWithdrawalReceived(container, input, ON)
    expect(result).toEqual({ sent: false, reason: "failed" })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("ordwdr_1")
    expect(warnings[0]).toContain("TypeError")
    expect(warnings[0]).not.toContain("vevo@example.hu")
    expect(warnings[0]).not.toContain("Kiss Anna")
    expect(warnings[0]).not.toContain("secret details")
  })
})
