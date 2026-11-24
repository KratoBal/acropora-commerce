import type { MedusaContainer } from "@medusajs/framework/types"

import { NEWSLETTER_MODULE } from "../../modules/newsletter"
import type NewsletterModuleService from "../../modules/newsletter/service"
import { WEBSHOP_MAIL_OUTBOX_MODULE } from "../../modules/webshop-mail-outbox"
import { NEWSLETTER_CONFIRM_PATH, newsletterConfirmMailOn } from "./webshop-mail/newsletter-confirm-mail"
import { storefrontPageUrl } from "./webshop-mail/order-view-url"
import { webshopMailRenderer } from "./webshop-mail/os-mail-render"
import { operationsOrSkip } from "./webshop-mail/send"

/**
 * WHAT BECAME OF THE NEWSLETTER'S CONFIRMATION MAILS, read straight (task hirlevel-diagnose-20261124). The OS list of mails that did not
 * go (`newsletter-unsent.ts`) shows only the not-sent reasons and swallows a failed read, so on the test shop 2026-11-24 an EMPTY list
 * proved nothing: four sign-ups got no mail, no notification and no outbox row, and the list said nothing. This read does not filter and
 * does not swallow: the last sign-ups with the result the row kept (or its ABSENCE: `null` is itself the answer), the newsletter's rows
 * in the mail outbox with what became of them, and the four preconditions the sender checks, as true or false, from THE PROCESS THAT
 * ANSWERS (the one that handles the sign-up), so a switch that exists on the worker and not on the server shows.
 *
 * NO SECRET AND NO FULL ADDRESS: the address is masked (first letter and the domain), also inside an outbox row's `last_error` (a provider's
 * message may carry the recipient), no token or hash is returned, and the environment is reported as booleans, never as values.
 * THE PRECONDITIONS ARE THE SERVER PROCESS'S: the sign-up route runs there and decides there; if the sending ever moves to the worker, this
 * read measures the wrong process. Read only; a failed read is the answer (it propagates as an error, which is the point).
 */
export type NewsletterDiagnostics = {
  generated_at: string
  preconditions: { switch_on: boolean; mail_on: boolean; renderer_os: boolean; storefront_https_url: boolean }
  sign_ups: {
    id: string
    email: string
    status: string
    created_at: string | null
    confirmation_sent_at: string | null
    confirmation_mail_result: string | null
    confirmation_mail_result_at: string | null
  }[]
  outbox: {
    id: string
    resource_id: string
    created_at: string | null
    sent_at: string | null
    attempts: number | null
    failure_kind: string | null
    last_error: string | null
    next_attempt_at: string | null
  }[]
}

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null)

/**
 * An error text with every address in it masked: a provider's message (the Gmail API) may carry the recipient's full address, so the
 * `last_error` of an outbox row goes through this, and the "no full address" promise holds for it too (barracuda 60990).
 */
export const maskAddressesIn = (text: string): string =>
  text.replace(/[A-Za-z0-9._%+-][A-Za-z0-9._%+'-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (match) => maskAddress(match))

/** `a***@example.test`: the first letter and the domain, nothing else. */
export const maskAddress = (email: string): string => {
  const at = email.lastIndexOf("@")
  return at < 1 ? "***" : `${email[0]}***${email.slice(at)}`
}

export const newsletterDiagnostics = async (
  container: MedusaContainer,
  limit: number,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date()
): Promise<NewsletterDiagnostics> => {
  const newsletter = container.resolve<NewsletterModuleService>(NEWSLETTER_MODULE)
  const signUps = (await newsletter.listNewsletterSubscribers({}, { take: limit, order: { created_at: "DESC" } })) as unknown as Record<
    string,
    unknown
  >[]
  const outbox = container.resolve<{
    listWebshopMailOutboxes(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<Record<string, unknown>[]>
  }>(WEBSHOP_MAIL_OUTBOX_MODULE)
  const rows = await outbox.listWebshopMailOutboxes({ template: "newsletter-confirm" }, { take: limit, order: { created_at: "DESC" } })
  return {
    generated_at: now.toISOString(),
    preconditions: {
      switch_on: newsletterConfirmMailOn(env),
      mail_on: operationsOrSkip(env),
      renderer_os: webshopMailRenderer(env) === "os",
      storefront_https_url: !!storefrontPageUrl(env, "hu", NEWSLETTER_CONFIRM_PATH),
    },
    sign_ups: signUps.map((row) => ({
      id: String(row.id),
      email: maskAddress(String(row.email ?? "")),
      status: String(row.status),
      created_at: iso(row.created_at as Date | string | null),
      confirmation_sent_at: iso(row.confirmation_sent_at as Date | string | null),
      confirmation_mail_result: (row.confirmation_mail_result as string | null | undefined) ?? null,
      confirmation_mail_result_at: iso(row.confirmation_mail_result_at as Date | string | null),
    })),
    outbox: rows.map((row) => ({
      id: String(row.id),
      resource_id: String(row.resource_id),
      created_at: iso(row.created_at as Date | string | null),
      sent_at: iso(row.sent_at as Date | string | null),
      attempts: typeof row.attempts === "number" ? row.attempts : null,
      failure_kind: (row.failure_kind as string | null | undefined) ?? null,
      last_error: typeof row.last_error === "string" ? maskAddressesIn(row.last_error) : null,
      next_attempt_at: iso(row.next_attempt_at as Date | string | null),
    })),
  }
}
