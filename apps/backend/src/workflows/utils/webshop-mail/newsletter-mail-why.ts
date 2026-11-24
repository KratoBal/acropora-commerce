import type { NewsletterMailResult } from "../../../modules/newsletter/double-opt-in"

/** The switch that lets the confirmation mail go (its own file: the mail sender and the OS list both read it, and neither may import the other). */
export const NEWSLETTER_CONFIRM_MAIL_ENV = "ACROPORA_NEWSLETTER_CONFIRM_MAIL"

/** The sentence for each way a confirmation mail does not go: what is off, and what to do. No address, no token. */
export const NEWSLETTER_MAIL_NOT_SENT_WHY: Record<Exclude<NewsletterMailResult, "sent" | "queued">, string> = {
  switch_off: `${NEWSLETTER_CONFIRM_MAIL_ENV} is not "on": the confirmation mail does not go (its text and the seven days wait for approval); a new sign-up sends it once the switch is on`,
  mail_off: "the shop's mail sending is off (ACROPORA_WEBSHOP_MAIL / the Gmail credentials): the confirmation mail does not go",
  os_renderer_off: "the OS mail renderer is off (ACROPORA_WEBSHOP_MAIL_RENDERER is not os): the confirmation mail does not go",
  no_storefront_url: "ACROPORA_STOREFRONT_URL is not an https address: the confirmation mail's links would go nowhere, so it does not go",
  failed: "the confirmation mail failed before it was sent or queued (see the warning line just above in this log)",
}

