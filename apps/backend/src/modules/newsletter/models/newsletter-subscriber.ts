import { model } from "@medusajs/framework/utils"

/**
 * A newsletter sign-up from the storefront footer (kirakat-lablec-kep,
 * acrobot 36614, 2026-10-27): the shop's own table, on the test storefront.
 * Nothing is mailed and nothing leaves the shop; the list can be moved to a
 * mailing service later.
 *
 * The consent is kept as it was given: the exact text the buyer saw, its
 * version (a hash of that text), the language of the form (`hu` or `en`; the
 * rows before the English shop are all `hu`) and the time. Signing up again with the same
 * address updates the row (name, consent), it does not add a second one.
 * `email` is stored trimmed and lowercased, so the unique index is the real
 * guard against a duplicate.
 *
 * DOUBLE OPT-IN (card d707cf5f, items 2 and 3; barracuda audit 05 A11): a
 * sign-up is `pending` until the address's owner opens the link mailed to it;
 * only a `confirmed` row may receive a newsletter. Leaving is as easy: one link,
 * no sign-in, and the row turns `unsubscribed` (it is kept, with its times, as
 * the record of the consent and its withdrawal). Rows signed up before this were
 * never confirmed, so they are `pending` too.
 *
 *   confirmation_token_hash  SHA-256 of the confirmation link's token; the token
 *                            itself is only in the mail. Cleared when used (or
 *                            on leaving), so a link works once.
 *   unsubscribe_token        the leaving link's token, KEPT AS IT IS: every
 *                            newsletter has to carry it, so it must be readable
 *                            when one is sent, and all it can do is take this
 *                            one address off the list. Never expires.
 */
export const NewsletterSubscriber = model
  .define("newsletter_subscriber", {
    id: model.id({ prefix: "nlsub" }).primaryKey(),
    email: model.text(),
    name: model.text(),
    consent_text: model.text(),
    consent_version: model.text(),
    consent_language: model.text().default("hu"),
    consented_at: model.dateTime(),
    /** Where the sign-up came from; today always `footer`. */
    source: model.text(),
    /** `pending`, `confirmed` or `unsubscribed` (`NEWSLETTER_STATUSES`). */
    status: model.text().default("pending"),
    confirmation_token_hash: model.text().nullable(),
    confirmation_sent_at: model.dateTime().nullable(),
    confirmed_at: model.dateTime().nullable(),
    unsubscribe_token: model.text().nullable(),
    unsubscribed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_newsletter_subscriber_email_unique",
      on: ["email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_newsletter_subscriber_confirmation_token_hash",
      on: ["confirmation_token_hash"],
      unique: true,
      where: "deleted_at IS NULL AND confirmation_token_hash IS NOT NULL",
    },
    {
      name: "IDX_newsletter_subscriber_unsubscribe_token",
      on: ["unsubscribe_token"],
      unique: true,
      where: "deleted_at IS NULL AND unsubscribe_token IS NOT NULL",
    },
  ])

export default NewsletterSubscriber
