import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { NEWSLETTER_CONFIRM_TTL_MS, newsletterTokenHash } from "../../../modules/newsletter/double-opt-in"
import { stockAlertOn } from "../../../modules/stock-alert/subject"
import { deliverShopMail } from "./deliver"
import { storefrontPageUrl } from "./order-view-url"
import { webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { operationsOrSkip } from "./send"

/**
 * THE STOCK ALERT'S CONFIRMATION MAIL ("Szólj, ha jön hasonló", V2.4, card 0c1265d2), the newsletter's double opt-in
 * (`newsletter-confirm-mail.ts`): the OS renders the text (`stock-alert-confirm`), the shop sends the two links, the
 * link's end and what the address signed up for. The text is not approved, so the mail goes only with
 * `ACROPORA_STOCK_ALERT=on`, on the test shop; an OS without the template answers 422 and the mail waits in the outbox.
 * Hungarian only (no English shop for this).
 *
 * The links point to the storefront's pages (`ertesites/megerosites`, `ertesites/leiratkozas`, token in the query),
 * which ask for a click before they call the shop, so a mail scanner opening every link confirms nothing.
 */
export const STOCK_ALERT_CONFIRM_PATH = "ertesites/megerosites"
export const STOCK_ALERT_UNSUBSCRIBE_PATH = "ertesites/leiratkozas"

export type StockAlertConfirmInput = {
  /** the sign-up's row id (the outbox's resource) */
  id: string
  to: string
  /** what the address signed up for, as the row keeps it ("Acropora abrolhosensis") */
  subject_label: string
  confirmation_token: string
  unsubscribe_token: string
  /** when the confirmation was recorded; the link works for seven days from it */
  sent_at: Date
}

export type StockAlertConfirmResult =
  | { sent: true }
  | {
      sent: false
      reason: "switch_off" | "mail_off" | "os_renderer_off" | "no_storefront_url" | "queued" | "failed"
    }

const withToken = (url: string, token: string) => `${url}?token=${encodeURIComponent(token)}`

/**
 * Sends (or queues) the confirmation. NEVER throws: the sign-up answers the same whatever happens here. Every new
 * confirmation token is a new mail (the key carries the token's hash prefix); the same one never goes twice.
 */
export const notifyStockAlertConfirm = async (
  container: MedusaContainer,
  input: StockAlertConfirmInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<StockAlertConfirmResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!stockAlertOn(env)) return { sent: false, reason: "switch_off" }
    if (!operationsOrSkip(env)) return { sent: false, reason: "mail_off" }
    if (webshopMailRenderer(env) !== "os") return { sent: false, reason: "os_renderer_off" }
    const confirmPage = storefrontPageUrl(env, "hu", STOCK_ALERT_CONFIRM_PATH)
    const unsubscribePage = storefrontPageUrl(env, "hu", STOCK_ALERT_UNSUBSCRIBE_PATH)
    if (!confirmPage || !unsubscribePage) return { sent: false, reason: "no_storefront_url" }

    const render: MailRenderFacts = {
      template: "stock-alert-confirm",
      facts: {
        confirm_url: withToken(confirmPage, input.confirmation_token),
        unsubscribe_url: withToken(unsubscribePage, input.unsubscribe_token),
        expires_at: new Date(input.sent_at.getTime() + NEWSLETTER_CONFIRM_TTL_MS).toISOString(),
        subject_label: input.subject_label,
      },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to: input.to,
      template: "stock-alert-confirm",
      idempotency_key: `stock-alert-confirm:${input.id}:${newsletterTokenHash(input.confirmation_token).slice(0, 16)}`,
      resource_id: input.id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
      common: { customer_name: null, order_created_at: null, locale: "hu", order_view_url: null },
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the row id and the error kind only: no address, no token
    logger.warn(`stock alert sign-up ${input.id}: the confirmation mail was not sent (${(error as Error)?.name ?? "error"})`)
    return { sent: false, reason: "failed" }
  }
}
