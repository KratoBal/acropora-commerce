import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import {
  type NewsletterMailResult,
  NEWSLETTER_CONFIRM_TTL_MS,
  newsletterTokenHash,
} from "../../../modules/newsletter/double-opt-in"
import type NewsletterModuleService from "../../../modules/newsletter/service"
import { parseOrderLocale } from "../order-locale"
import { deliverShopMail } from "./deliver"
import { storefrontPageUrl } from "./order-view-url"
import { webshopMailEnglish, webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { NEWSLETTER_CONFIRM_MAIL_ENV, NEWSLETTER_MAIL_NOT_SENT_WHY } from "./newsletter-mail-why"
import { operationsOrSkip } from "./send"

/**
 * THE NEWSLETTER'S CONFIRMATION MAIL (double opt-in, card d707cf5f items 2 and 3; barracuda audit 05 A11).
 *
 * THE OS RENDERS IT AND NOTHING ELSE DOES (Balázs, 2026-10-05: the OS renders, the shop sends, no built-in fallback
 * mail): the shop sends the two links and the link's end; the text is the OS's `WEBSHOP_NEWSLETTER_CONFIRM` (and its
 * English twin). The text and the seven days are on Balázs's list (acrobot 44952), so the mail goes only with
 * `ACROPORA_NEWSLETTER_CONFIRM_MAIL=on`, on the test shop, until he approves them.
 *
 * The links point to the storefront's pages (`hirlevel/megerosites`, `hirlevel/leiratkozas`, with the token in the
 * query): the page asks for a click before it calls the shop, so a mail scanner that opens every link confirms
 * nothing. The outbox keeps the facts until the mail is sent, the confirmation token with them: a reader of the shop's
 * database could confirm an address, which the same reader could also write directly.
 */
export { NEWSLETTER_CONFIRM_MAIL_ENV } from "./newsletter-mail-why"
export const NEWSLETTER_CONFIRM_PATH = "hirlevel/megerosites"
export const NEWSLETTER_UNSUBSCRIBE_PATH = "hirlevel/leiratkozas"

export const newsletterConfirmMailOn = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[NEWSLETTER_CONFIRM_MAIL_ENV]?.trim() === "on"

export type NewsletterConfirmInput = {
  /** the sign-up's row id (the outbox's resource) */
  id: string
  to: string
  name: string
  /** the form's language (`hu` or `en`) */
  language: string
  confirmation_token: string
  unsubscribe_token: string
  /** when the confirmation was recorded; the link works for seven days from it */
  sent_at: Date
}

export type NewsletterConfirmResult =
  | { sent: true }
  | {
      sent: false
      reason: "switch_off" | "mail_off" | "os_renderer_off" | "no_storefront_url" | "queued" | "failed"
    }

const withToken = (url: string, token: string) => `${url}?token=${encodeURIComponent(token)}`

/**
 * Sends (or queues) the confirmation. NEVER throws: the sign-up is recorded and answers the same whatever happens
 * here, so a mail that cannot go (a switch off, the OS or the provider down) does not tell the caller anything.
 * Every new confirmation token is a new mail (the key carries the token's hash prefix); the same one never goes twice.
 */
export const notifyNewsletterConfirm = async (
  container: MedusaContainer,
  input: NewsletterConfirmInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<NewsletterConfirmResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!newsletterConfirmMailOn(env)) return { sent: false, reason: "switch_off" }
    if (!operationsOrSkip(env)) return { sent: false, reason: "mail_off" }
    if (webshopMailRenderer(env) !== "os") return { sent: false, reason: "os_renderer_off" }
    // the language of the form; with the English mails off every mail is asked for in Hungarian, like an order's
    const locale = (webshopMailEnglish(env) && parseOrderLocale(input.language)) || "hu"
    const confirmPage = storefrontPageUrl(env, locale, NEWSLETTER_CONFIRM_PATH)
    const unsubscribePage = storefrontPageUrl(env, locale, NEWSLETTER_UNSUBSCRIBE_PATH)
    if (!confirmPage || !unsubscribePage) return { sent: false, reason: "no_storefront_url" }

    const render: MailRenderFacts = {
      template: "newsletter-confirm",
      facts: {
        confirm_url: withToken(confirmPage, input.confirmation_token),
        unsubscribe_url: withToken(unsubscribePage, input.unsubscribe_token),
        expires_at: new Date(input.sent_at.getTime() + NEWSLETTER_CONFIRM_TTL_MS).toISOString(),
      },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to: input.to,
      template: "newsletter-confirm",
      idempotency_key: `newsletter-confirm:${input.id}:${newsletterTokenHash(input.confirmation_token).slice(0, 16)}`,
      resource_id: input.id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
      common: { customer_name: input.name, order_created_at: null, locale, order_view_url: null },
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the row id and the error kind only: no address, no token
    logger.warn(`newsletter sign-up ${input.id}: the confirmation mail was not sent (${(error as Error)?.name ?? "error"})`)
    return { sent: false, reason: "failed" }
  }
}

/** The result the row keeps for what `notifyNewsletterConfirm` answered. */
export const newsletterMailResultOf = (outcome: NewsletterConfirmResult): NewsletterMailResult =>
  outcome.sent ? "sent" : outcome.reason

/**
 * WHAT BECAME OF THE MAIL, recorded and said (task hirlevel-level-eredmeny-20261124). The sign-up answers 200 whatever happens to
 * the mail (so the answer does not tell addresses apart), which left a mail that did not go with no trace: measured on the test shop
 * 2026-11-24, three sign-ups, one mail, and nothing anywhere to say why. Now the row keeps the result (`confirmation_mail_result`),
 * the log says it in one line with the row's id (no address, no token), and the OS's list of mails that did not go shows the
 * unsent ones (`newsletter-unsent.ts`). NEVER THROWS: the sign-up has long been answered.
 */
export const recordNewsletterConfirmOutcome = async (
  container: MedusaContainer,
  input: { id: string; sentAt: Date },
  outcome: NewsletterConfirmResult
): Promise<void> => {
  const result = newsletterMailResultOf(outcome)
  try {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    if (result === "sent" || result === "queued") logger.info(`newsletter sign-up ${input.id}: the confirmation mail is ${result}`)
    else logger.warn(`newsletter sign-up ${input.id}: the confirmation mail was NOT sent (${result}): ${NEWSLETTER_MAIL_NOT_SENT_WHY[result]}`)
  } catch {
    // no logger: the row below is the record
  }
  try {
    await container.resolve<NewsletterModuleService>(NEWSLETTER_MODULE).recordConfirmationMailResult(input.id, input.sentAt, result)
  } catch (error) {
    try {
      container
        .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
        .warn(`newsletter sign-up ${input.id}: the mail result (${result}) could not be recorded (${(error as Error)?.name ?? "error"})`)
    } catch {
      // nothing left to tell
    }
  }
}
