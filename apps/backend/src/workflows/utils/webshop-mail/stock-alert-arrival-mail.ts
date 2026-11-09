import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { stockAlertOn } from "../../../modules/stock-alert/subject"
import { parseOrderLocale } from "../order-locale"
import { deliverShopMail } from "./deliver"
import { storefrontPageUrl } from "./order-view-url"
import { webshopMailEnglish, webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { operationsOrSkip } from "./send"
import { STOCK_ALERT_UNSUBSCRIBE_PATH } from "./stock-alert-confirm-mail"

/**
 * THE STOCK ALERT'S ARRIVAL MAIL ("Szólj, ha jön hasonló", V2.4, card 0c1265d2): ONE mail to a confirmed row when a
 * piece of what it waits for becomes buyable (`modules/stock-alert/arrival.ts`, the job `stock-alert-arrivals`). The
 * OS renders the text (`stock-alert-arrival`); the shop sends what was waited for, the piece that came, its page and
 * the leaving link. The text is not approved, so it goes only with `ACROPORA_STOCK_ALERT=on`, on the test shop; an OS
 * without the template answers 422 and the mail waits in the outbox. The language is the form's when the English
 * mails are on, Hungarian otherwise (the confirmation's rule).
 */
export const PRODUCT_PAGE_PATH = "termek"

export type StockAlertArrivalInput = {
  /** the row id (the outbox's resource) */
  id: string
  to: string
  subject_label: string
  /** the form's language (`hu` or `en`) */
  language: string
  unsubscribe_token: string
  /** when the row was confirmed: one arrival mail per confirmation, so a new wait gets a new mail */
  confirmed_at: Date | string
  product: { title: string; handle: string }
}

export type StockAlertArrivalResult =
  | { sent: true }
  | { sent: false; reason: "not_ready" | "queued" | "failed" }

/** Every switch the arrival mail needs; the job asks first, so a sweep that cannot mail reads nothing. */
export const stockAlertArrivalReady = (env: NodeJS.ProcessEnv = process.env): boolean =>
  stockAlertOn(env) &&
  !!operationsOrSkip(env) &&
  webshopMailRenderer(env) === "os" &&
  storefrontPageUrl(env, "hu", PRODUCT_PAGE_PATH) !== null

/**
 * Sends (or queues) the arrival. NEVER throws. The key is the row and its confirmation, so the same wait is never
 * told twice, even by two sweeps at once; a queued mail counts as handed over (the outbox tries it again).
 */
export const notifyStockAlertArrival = async (
  container: MedusaContainer,
  input: StockAlertArrivalInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<StockAlertArrivalResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!stockAlertArrivalReady(env)) return { sent: false, reason: "not_ready" }
    const locale = (webshopMailEnglish(env) && parseOrderLocale(input.language)) || "hu"
    const productPage = storefrontPageUrl(env, locale, `${PRODUCT_PAGE_PATH}/${encodeURIComponent(input.product.handle)}`)
    const unsubscribePage = storefrontPageUrl(env, locale, STOCK_ALERT_UNSUBSCRIBE_PATH)
    if (!productPage || !unsubscribePage) return { sent: false, reason: "not_ready" }

    const render: MailRenderFacts = {
      template: "stock-alert-arrival",
      facts: {
        subject_label: input.subject_label,
        product_title: input.product.title,
        product_url: productPage,
        unsubscribe_url: `${unsubscribePage}?token=${encodeURIComponent(input.unsubscribe_token)}`,
      },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to: input.to,
      template: "stock-alert-arrival",
      idempotency_key: `stock-alert-arrival:${input.id}:${new Date(input.confirmed_at).getTime()}`,
      resource_id: input.id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
      common: { customer_name: null, order_created_at: null, locale, order_view_url: null },
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the row id and the error kind only: no address, no token
    logger.warn(`stock alert ${input.id}: the arrival mail was not sent (${(error as Error)?.name ?? "error"})`)
    return { sent: false, reason: "failed" }
  }
}
