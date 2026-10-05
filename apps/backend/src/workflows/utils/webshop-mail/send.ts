import type { CreateNotificationDTO } from "@medusajs/framework/types"

import { webshopMailState } from "../webshop-mail-config"
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

/** One mail through the email channel; the idempotency key keeps it single. */
export const sendShopMail = (notifications: NotificationModule, mail: MailToSend) =>
  notifications.createNotifications({
    to: mail.to,
    channel: "email",
    template: mail.template,
    trigger_type: mail.trigger ?? mail.template,
    resource_id: mail.resource_id,
    resource_type: "order",
    idempotency_key: mail.idempotency_key,
    content: mail.content,
  })
