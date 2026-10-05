import {
  WEBSHOP_MAIL_FACTS_VERSION,
  type WebshopMailFactsOf,
  type WebshopMailRenderRequest,
  type WebshopMailTemplate,
} from "./facts"
import type { OsRenderResult } from "./os-mail-render"
import { afterFailure, needsAlert } from "./outbox-policy"
import type { MailToSend } from "./prepare"

/**
 * THE SHOP'S MAIL THROUGH THE OS (Levélsablonok; Balázs, 2026-10-05 20:11
 * UTC): with the switch on `os`, every mail goes into the outbox, is rendered
 * by the OS and only then handed to the notification module. There is no
 * built-in fallback: a mail the OS cannot render now waits and is tried
 * again (`outbox-policy.ts`); with the switch off, the built-in text goes, as
 * before.
 */

/** What a builder gives besides its text: the facts the OS renders from, without the common two. */
export type MailRenderFacts = {
  [T in WebshopMailTemplate]: {
    template: T
    facts: Omit<WebshopMailFactsOf[T], "customer_name" | "order_created_at">
  }
}[WebshopMailTemplate]

export type OutboxRow = {
  id: string
  template: string
  facts: Record<string, unknown>
  facts_version: number
  to: string
  resource_id: string
  idempotency_key: string
  trigger_type: string | null
  attempts: number
  created_at: Date | string
  sent_at: Date | string | null
  failure_kind: string | null
  alerted_at: Date | string | null
}

export type OutboxOperations = {
  findByKey(idempotencyKey: string): Promise<OutboxRow | null>
  create(row: Omit<OutboxRow, "id" | "created_at" | "sent_at" | "failure_kind" | "alerted_at">): Promise<OutboxRow>
  update(
    id: string,
    changes: Partial<Omit<OutboxRow, "id">> & {
      next_attempt_at?: Date | null
      last_error?: string | null
    }
  ): Promise<void>
  /** The two facts every template carries, from the order (`resource_id`). */
  loadCommon(resourceId: string): Promise<{ customer_name: string | null; order_created_at: string | null }>
  render(request: WebshopMailRenderRequest): Promise<OsRenderResult>
  /** The rendered mail to the notification module, under the mail's own key. */
  send(mail: MailToSend): Promise<void>
  now(): Date
}

/**
 * What the caller learns: sent, or waiting in the outbox. `queued` is not a
 * failure: the mail will go when the OS renders it, or be reported.
 */
export type DeliveryResult = { sent: true } | { sent: false; queued: true; reason: string }

const requestOf = (row: OutboxRow): WebshopMailRenderRequest =>
  ({
    template: row.template,
    facts_version: row.facts_version,
    facts: row.facts,
  }) as WebshopMailRenderRequest

/** One try of one row: rendered and sent, or its failure recorded. */
export const attemptOutboxRow = async (row: OutboxRow, ops: OutboxOperations): Promise<DeliveryResult> => {
  const attempts = row.attempts + 1
  const rendered = await ops.render(requestOf(row))
  if (!rendered.ok) {
    const next = afterFailure(rendered, attempts, ops.now())
    await ops.update(row.id, {
      attempts,
      next_attempt_at: next.next_attempt_at,
      failure_kind: next.failure_kind,
      last_error: rendered.message,
    })
    return { sent: false, queued: true, reason: rendered.message }
  }
  try {
    await ops.send({
      to: row.to,
      template: row.template as MailToSend["template"],
      trigger: row.trigger_type ?? undefined,
      idempotency_key: row.idempotency_key,
      resource_id: row.resource_id,
      content: {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
    })
  } catch (error) {
    // the mail provider failed: Medusa keeps the key open after a failure,
    // so the same mail is tried again on the transient cadence
    const message = `A levél küldése nem sikerült: ${error instanceof Error ? error.message : String(error)}`
    const next = afterFailure({ kind: "transient", message }, attempts, ops.now())
    await ops.update(row.id, {
      attempts,
      next_attempt_at: next.next_attempt_at,
      failure_kind: next.failure_kind,
      last_error: message,
    })
    return { sent: false, queued: true, reason: message }
  }
  await ops.update(row.id, {
    attempts,
    sent_at: ops.now(),
    next_attempt_at: null,
    failure_kind: null,
    last_error: null,
  })
  return { sent: true }
}

/**
 * A NEW MAIL INTO THE OUTBOX, AND ITS FIRST TRY AT ONCE. One row per mail (its
 * idempotency key): a mail already sent is not sent again, one already
 * waiting is tried again now instead of getting a second row.
 */
export const deliverThroughOutbox = async (
  mail: MailToSend & { render: MailRenderFacts },
  ops: OutboxOperations
): Promise<DeliveryResult> => {
  const existing = await ops.findByKey(mail.idempotency_key)
  if (existing?.sent_at) return { sent: true }
  const row =
    existing ??
    (await ops.create({
      template: mail.render.template,
      facts: {
        ...(await ops.loadCommon(mail.resource_id)),
        ...mail.render.facts,
      },
      facts_version: WEBSHOP_MAIL_FACTS_VERSION,
      to: mail.to,
      resource_id: mail.resource_id,
      idempotency_key: mail.idempotency_key,
      trigger_type: mail.trigger ?? null,
      attempts: 0,
    }))
  return attemptOutboxRow(row, ops)
}

/** The retry job's pass: every due row tried once, every newly stuck row reported once. */
export const runOutbox = async (
  ops: OutboxOperations & {
    due(now: Date): Promise<OutboxRow[]>
    unsentToReport(now: Date): Promise<OutboxRow[]>
    report(row: OutboxRow): void
  }
): Promise<{ tried: number; sent: number; reported: number }> => {
  const now = ops.now()
  let sent = 0
  const due = await ops.due(now)
  for (const row of due) {
    const result = await attemptOutboxRow(row, ops).catch((error: unknown) => {
      ops.report({
        ...row,
        failure_kind: `error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return { sent: false } as const
    })
    if (result.sent) sent++
  }
  let reported = 0
  for (const row of await ops.unsentToReport(now)) {
    if (!needsAlert(row, ops.now())) continue
    await ops.update(row.id, { alerted_at: ops.now() })
    ops.report(row)
    reported++
  }
  return { tried: due.length, sent, reported }
}
