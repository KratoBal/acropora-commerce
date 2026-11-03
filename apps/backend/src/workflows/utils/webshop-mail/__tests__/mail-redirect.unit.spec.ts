import { deliverShopMail } from "../deliver"
import type { MailToSend } from "../prepare"
import { mailAsSent, sendShopMail } from "../send"
import { webshopMailRedirect } from "../../webshop-mail-config"

/*
  WHAT TURNS THIS RED (acrobot 41809): a redirect that does not change the recipient; a redirect that
  loses the original recipient (the subject and both bodies must name it); a value that is set but not
  one address and still reaches the notification module (it must stop, not fall back to the customer);
  a blank value that counts as a redirect; the redirect applied on one delivery path but not the other;
  the idempotency key, template or resource changed by the redirect.
*/
const mail: MailToSend = {
  to: "vevo@example.test",
  template: "order-placed",
  trigger: "order-placed:o1",
  idempotency_key: "order-placed:order_42",
  resource_id: "order_42",
  content: { subject: "Rendelés visszaigazolás", text: "Köszönjük!", html: "<p>Köszönjük!</p>" },
}

const REDIRECT = "ACROPORA_WEBSHOP_MAIL_REDIRECT_TO"

const notifications = () => {
  const sent: Array<Record<string, unknown>> = []
  return {
    sent,
    module: {
      createNotifications: async (n: Record<string, unknown>) => {
        sent.push(n)
      },
    },
  }
}

describe("webshopMailRedirect", () => {
  it("reads unset and blank as off, one address as a redirect, anything else as invalid", () => {
    expect(webshopMailRedirect({})).toEqual({ kind: "off" })
    expect(webshopMailRedirect({ [REDIRECT]: "" })).toEqual({ kind: "off" })
    expect(webshopMailRedirect({ [REDIRECT]: "   " })).toEqual({ kind: "off" })
    expect(webshopMailRedirect({ [REDIRECT]: " teszt@acropora.hu " })).toEqual({ kind: "to", address: "teszt@acropora.hu" })
    for (const bad of [
      "nem-cim",
      "a@b",
      "a@b.hu, c@d.hu",
      "a@b.hu;c@d.hu",
      "a@b.hu c@d.hu",
      "Név <a@b.hu>",
      "@b.hu",
      "a@.hu",
    ])
      expect(webshopMailRedirect({ [REDIRECT]: bad })).toEqual({ kind: "invalid" })
  })
})

describe("mailAsSent", () => {
  it("without a redirect the mail is exactly what was built", () => {
    expect(mailAsSent(mail, {})).toEqual({ to: mail.to, content: mail.content })
    expect(mailAsSent(mail, { [REDIRECT]: "  " })).toEqual({ to: mail.to, content: mail.content })
  })

  it("with a redirect the recipient is replaced, and the original is named in the subject, the text and the html", () => {
    const sent = mailAsSent(mail, { [REDIRECT]: "teszt@acropora.hu" })
    expect(sent.to).toBe("teszt@acropora.hu")
    expect(sent.content.subject).toBe("[TESZT: az eredeti címzett vevo@example.test] Rendelés visszaigazolás")
    expect(sent.content.text.startsWith("TESZT: az eredeti címzett vevo@example.test\n\n")).toBe(true)
    expect(sent.content.text.endsWith("Köszönjük!")).toBe(true)
    expect(sent.content.html).toContain("vevo@example.test")
    expect(sent.content.html.endsWith("<p>Köszönjük!</p>")).toBe(true)
  })

  it("escapes the original recipient in the html banner", () => {
    const odd = { ...mail, to: 'a"<b>@x.test' }
    expect(mailAsSent(odd, { [REDIRECT]: "teszt@acropora.hu" }).content.html).not.toContain("<b>")
  })

  it("a set but unreadable value stops the mail instead of falling back to the customer", () => {
    expect(() => mailAsSent(mail, { [REDIRECT]: "nem-cim" })).toThrow(/not sent/)
    expect(() => mailAsSent(mail, { [REDIRECT]: "a@b.hu, c@d.hu" })).toThrow(/not sent/)
  })
})

describe("sendShopMail with the redirect", () => {
  it("hands the notification module the redirect address and keeps the key, template and resource", async () => {
    const n = notifications()
    await sendShopMail(n.module, mail, { [REDIRECT]: "teszt@acropora.hu" })
    expect(n.sent).toHaveLength(1)
    expect(n.sent[0]).toMatchObject({
      to: "teszt@acropora.hu",
      channel: "email",
      template: "order-placed",
      idempotency_key: "order-placed:order_42",
      resource_id: "order_42",
      resource_type: "order",
    })
  })

  it("never calls the notification module for an unreadable value", async () => {
    const n = notifications()
    expect(() => sendShopMail(n.module, mail, { [REDIRECT]: "nem-cim" })).toThrow(/not sent/)
    expect(n.sent).toHaveLength(0)
  })
})

describe("deliverShopMail with the redirect (the built-in path)", () => {
  it("sends to the redirect address", async () => {
    const n = notifications()
    const container = { resolve: () => n.module } as never
    await deliverShopMail(container, mail, { [REDIRECT]: "teszt@acropora.hu" })
    expect(n.sent[0]).toMatchObject({ to: "teszt@acropora.hu" })
  })
})
