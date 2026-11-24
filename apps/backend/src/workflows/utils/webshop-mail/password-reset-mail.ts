import { createHash } from "node:crypto"

import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { parseOrderLocale } from "../order-locale"
import { deliverShopMail } from "./deliver"
import { storefrontPageUrl } from "./order-view-url"
import { webshopMailEnglish, webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { operationsOrSkip } from "./send"

/**
 * THE CUSTOMER'S PASSWORD-RESET MAIL (card 7bfca4eb; Balázs 2026-11-24 14:00 UTC: every customer mail is editable in the OS).
 *
 * THE OS RENDERS IT AND NOTHING ELSE DOES (Balázs, 2026-10-05: the OS renders, the shop sends, no built-in fallback mail): the shop
 * sends the link and how long it lives; the text is the OS's `WEBSHOP_PASSWORD_RESET` (and its English twin). Like the newsletter's
 * and the stock alert's, the mail goes only with its own switch, `ACROPORA_PASSWORD_RESET_MAIL=on`, on the test shop, until the text
 * is approved.
 *
 * THE LINK points to the storefront's new-password page (`uj-jelszo`, the token in the query): the page asks for the new password
 * before it calls the shop, so a mail scanner that opens every link changes nothing. The token is Medusa's reset token: it works
 * ONCE and for 15 minutes (core-flows 2.23, `generate-reset-password-token`: a fixed `RESET_PASSWORD_TOKEN_TTL_SECONDS`), which
 * the mail says. The outbox keeps the facts until the mail is sent, the token with them (as the newsletter's confirmation token):
 * a reader of the shop's database could set a password with it for fifteen minutes, which the same reader could also write directly.
 */
export const PASSWORD_RESET_MAIL_ENV = "ACROPORA_PASSWORD_RESET_MAIL"
export const PASSWORD_RESET_PATH = "uj-jelszo"
/** Medusa 2.23's reset token lifetime (a constant inside core-flows, not configurable); the mail names it. */
export const PASSWORD_RESET_VALID_MINUTES = 15

export const passwordResetMailOn = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[PASSWORD_RESET_MAIL_ENV]?.trim() === "on"

export type PasswordResetInput = {
  /** the account's customer id (the outbox's resource) */
  customer_id: string
  to: string
  /** the account's name, or null when it has none */
  name: string | null
  /** the language the request was made in (`hu` or `en`) */
  language: string
  /** Medusa's reset token, as the event gave it */
  token: string
}

export type PasswordResetResult =
  | { sent: true }
  | { sent: false; reason: "switch_off" | "mail_off" | "os_renderer_off" | "no_storefront_url" | "queued" | "failed" }

const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 16)

/**
 * Sends (or queues) the reset mail. NEVER throws: the request answers 201 whatever happens here (the route never tells whether an
 * address has an account), so a mail that cannot go does not tell the caller anything. Every reset token is a new mail (the key
 * carries the token's hash prefix); the same one never goes twice.
 */
export const notifyPasswordReset = async (
  container: MedusaContainer,
  input: PasswordResetInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<PasswordResetResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!passwordResetMailOn(env)) return { sent: false, reason: "switch_off" }
    if (!operationsOrSkip(env)) return { sent: false, reason: "mail_off" }
    if (webshopMailRenderer(env) !== "os") return { sent: false, reason: "os_renderer_off" }
    // the language of the request; with the English mails off every mail is asked for in Hungarian, like an order's
    const locale = (webshopMailEnglish(env) && parseOrderLocale(input.language)) || "hu"
    const page = storefrontPageUrl(env, locale, PASSWORD_RESET_PATH)
    if (!page) return { sent: false, reason: "no_storefront_url" }

    const render: MailRenderFacts = {
      template: "password-reset",
      facts: {
        reset_url: `${page}?token=${encodeURIComponent(input.token)}`,
        valid_minutes: PASSWORD_RESET_VALID_MINUTES,
      },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to: input.to,
      template: "password-reset",
      idempotency_key: `password-reset:${input.customer_id}:${tokenKey(input.token)}`,
      resource_id: input.customer_id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
      common: { customer_name: input.name, order_created_at: null, locale, order_view_url: null },
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the customer id and the error kind only: no address, no token
    logger.warn(`password reset for customer ${input.customer_id}: the mail was not sent (${(error as Error)?.name ?? "error"})`)
    return { sent: false, reason: "failed" }
  }
}
