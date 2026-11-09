import { model } from "@medusajs/framework/utils"

/**
 * "SZÓLJ, HA JÖN HASONLÓ" (V2.4, card 0c1265d2) and, on the same table, the later "Szólj, ha újra kapható" (V2.6 S3):
 * one address asks to be told when a SPECIES (`subject_kind = species`, the key the lowercased binomial,
 * "acropora abrolhosensis") or a PRODUCT (`subject_kind = product`, the key the product id) can be bought again.
 * Nothing is sold and no money is involved.
 *
 * The consent is kept as it was given (the text the buyer saw, its version, the time), as the newsletter keeps it.
 * One row per address and subject: signing up again for the same subject updates the row, a second subject is a
 * second row. `email` is stored trimmed and lowercased, so the unique index is the real guard against a duplicate.
 *
 * DOUBLE OPT-IN, the newsletter's (card d707cf5f): a row is `pending` until the address's owner opens the mailed
 * link; only a `confirmed` row may ever be told about an arrival. Leaving is one link, no sign-in, and the row turns
 * `unsubscribed` (kept, with its times, as the record of the consent and its withdrawal).
 *
 *   subject_label            what the buyer signed up for, as the shop wrote it then ("Acropora abrolhosensis");
 *                            the mails name it.
 *   source_product_id        the product page the sign-up came from (the sold piece); the arrival mail can point
 *                            back to it.
 *   confirmation_token_hash  SHA-256 of the confirmation link's token; cleared when used (or on leaving).
 *   unsubscribe_token        the leaving link's token, kept as it is: every alert mail carries it. Never expires.
 *
 * THE ARRIVAL (`arrival.ts`, the job `stock-alert-arrivals`): a confirmed row is told ONCE, when a piece of its subject
 * becomes buyable that it had not seen buyable.
 *   known_available          the subject's products that were already buyable, as the last sweep saw them (null until
 *                            the first sweep after the confirmation); a product in it is not news.
 *   notified_at              when the arrival mail was handed over; the row is then done until a new sign-up.
 *   notified_product_id      the product the arrival mail named.
 */
export const StockAlertSubscription = model
  .define("stock_alert_subscription", {
    id: model.id({ prefix: "stkal" }).primaryKey(),
    email: model.text(),
    /** `species` or `product` (`STOCK_ALERT_KINDS`). */
    subject_kind: model.text(),
    subject_key: model.text(),
    subject_label: model.text(),
    source_product_id: model.text().nullable(),
    consent_text: model.text(),
    consent_version: model.text(),
    consent_language: model.text().default("hu"),
    consented_at: model.dateTime(),
    /** Where the sign-up came from; today always `sold_piece` (the sold unique piece's page). */
    source: model.text(),
    /** `pending`, `confirmed` or `unsubscribed`. */
    status: model.text().default("pending"),
    confirmation_token_hash: model.text().nullable(),
    confirmation_sent_at: model.dateTime().nullable(),
    confirmed_at: model.dateTime().nullable(),
    unsubscribe_token: model.text().nullable(),
    unsubscribed_at: model.dateTime().nullable(),
    known_available: model.json().nullable(),
    notified_at: model.dateTime().nullable(),
    notified_product_id: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_stock_alert_subscription_email_subject_unique",
      on: ["email", "subject_kind", "subject_key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      // the arrival side's lookup: who waits for this species or product
      name: "IDX_stock_alert_subscription_subject",
      on: ["subject_kind", "subject_key"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_stock_alert_subscription_confirmation_token_hash",
      on: ["confirmation_token_hash"],
      unique: true,
      where: "deleted_at IS NULL AND confirmation_token_hash IS NOT NULL",
    },
    {
      name: "IDX_stock_alert_subscription_unsubscribe_token",
      on: ["unsubscribe_token"],
      unique: true,
      where: "deleted_at IS NULL AND unsubscribe_token IS NOT NULL",
    },
  ])

export default StockAlertSubscription
