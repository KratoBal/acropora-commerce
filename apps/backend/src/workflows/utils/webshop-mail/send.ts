import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { WEBSHOP_MAIL_REDIRECT_ENV, webshopMailRedirect, webshopMailState } from "../webshop-mail-config"
import type { MailToSend } from "./prepare"

/**
 * Off means silent: without the switch and its keys there is no email provider,
 * and the subscribers do nothing at all (no query, no split completion).
 */
export const operationsOrSkip = (env: NodeJS.ProcessEnv = process.env): boolean =>
  webshopMailState(env) === "on"

type NotificationModule = {
  createNotifications(data: CreateNotificationDTO): Promise<unknown>
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * The recipient and the content as they leave. With the test redirect on, the mail goes to the
 * redirect address and says, in the subject and at the top of both bodies, who it was meant for.
 * A redirect value that is set but not one address stops the mail (it throws, the outbox keeps the
 * row and its error): it never falls back to the real recipient.
 */
export const mailAsSent = (
  mail: MailToSend,
  env: NodeJS.ProcessEnv = process.env
): { to: string; content: MailToSend["content"] } => {
  const redirect = webshopMailRedirect(env)
  if (redirect.kind === "off") return { to: mail.to, content: mail.content }
  if (redirect.kind === "invalid")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${WEBSHOP_MAIL_REDIRECT_ENV} is set but is not one e-mail address: the mail is not sent`
    )
  const note = `TESZT: az eredeti címzett ${mail.to}`
  return {
    to: redirect.address,
    content: {
      subject: `[${note}] ${mail.content.subject}`,
      text: `${note}\n\n${mail.content.text}`,
      html: `<p><strong>${escapeHtml(note)}</strong></p>${mail.content.html}`,
    },
  }
}

/** The mails whose resource is a sign-up, not an order: the notification's `resource_type`. */
const SIGN_UP_RESOURCE: Partial<Record<MailToSend["template"], string>> = {
  "newsletter-confirm": "newsletter_subscriber",
  "stock-alert-confirm": "stock_alert_subscription",
  "stock-alert-arrival": "stock_alert_subscription",
}

/** One mail through the email channel; the idempotency key keeps it single. */
export const sendShopMail = (notifications: NotificationModule, mail: MailToSend, env: NodeJS.ProcessEnv = process.env) => {
  const { to, content } = mailAsSent(mail, env)
  return notifications.createNotifications({
    to,
    channel: "email",
    template: mail.template,
    trigger_type: mail.trigger ?? mail.template,
    resource_id: mail.resource_id,
    // every shop mail is about an order, except the sign-ups' mails (their resource is the sign-up)
    resource_type: SIGN_UP_RESOURCE[mail.template] ?? "order",
    idempotency_key: mail.idempotency_key,
    content,
  })
}
