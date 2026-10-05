import { model } from "@medusajs/framework/utils"

/**
 * ONE MAIL ON ITS WAY (Levélsablonok): the facts it is rendered from, where
 * it goes, and how far it got. A mail stays here until the OS rendered it and
 * the notification module took it; then `sent_at` is set. See
 * `webshop-mail/outbox-policy.ts` for the retry and the report.
 */
export const WebshopMailOutbox = model
  .define("webshop_mail_outbox", {
    id: model.id({ prefix: "wmout" }).primaryKey(),
    template: model.text(),
    /** The render request's facts (`webshop-mail/facts.ts`), with their version. */
    facts: model.json(),
    facts_version: model.number(),
    to: model.text(),
    resource_id: model.text(),
    /** The mail's own idempotency key (unchanged from before): one row per mail. */
    idempotency_key: model.text(),
    trigger_type: model.text().nullable(),
    attempts: model.number().default(0),
    next_attempt_at: model.dateTime().nullable(),
    failure_kind: model.text().nullable(),
    last_error: model.text().nullable(),
    sent_at: model.dateTime().nullable(),
    alerted_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["idempotency_key"], unique: true, where: "deleted_at IS NULL" },
    { on: ["sent_at", "next_attempt_at"] },
  ])

export default WebshopMailOutbox
