import { model } from "@medusajs/framework/utils"

/**
 * A newsletter sign-up from the storefront footer (kirakat-lablec-kep,
 * acrobot 36614, 2026-10-27): the shop's own table, on the test storefront.
 * Nothing is mailed and nothing leaves the shop; the list can be moved to a
 * mailing service later.
 *
 * The consent is kept as it was given: the exact text the buyer saw, its
 * version (a hash of that text) and the time. Signing up again with the same
 * address updates the row (name, consent), it does not add a second one.
 * `email` is stored trimmed and lowercased, so the unique index is the real
 * guard against a duplicate.
 */
export const NewsletterSubscriber = model
  .define("newsletter_subscriber", {
    id: model.id({ prefix: "nlsub" }).primaryKey(),
    email: model.text(),
    name: model.text(),
    consent_text: model.text(),
    consent_version: model.text(),
    consented_at: model.dateTime(),
    /** Where the sign-up came from; today always `footer`. */
    source: model.text(),
  })
  .indexes([
    {
      name: "IDX_newsletter_subscriber_email_unique",
      on: ["email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default NewsletterSubscriber
