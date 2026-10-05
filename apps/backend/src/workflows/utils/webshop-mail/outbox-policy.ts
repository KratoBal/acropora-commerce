import type { OsRenderFailure } from "./os-mail-render"

/**
 * THE MAIL OUTBOX'S RULES (Balázs, 2026-10-05 20:11 UTC: no built-in fallback
 * mail; when the OS cannot render, the mail waits and is tried again every
 * few minutes, and one not sent within an hour is reported, in the OS and to
 * acrobot).
 *
 *   transient failure   retried: 2, 4, 8, 15, 15 ... minutes
 *   permanent / config  not retried on a timer: reported at once (a bad
 *                       template or a wrong token does not mend itself)
 *   an hour unsent      reported, once
 */
export const OUTBOX_RETRY_MAX_MINUTES = 15
export const OUTBOX_STUCK_AFTER_MS = 60 * 60 * 1000

const MINUTE_MS = 60 * 1000

/** Minutes to the next try after the `attempts`-th failed one (1 = the first). */
export const retryDelayMinutes = (attempts: number): number =>
  Math.min(2 ** Math.max(1, attempts), OUTBOX_RETRY_MAX_MINUTES)

export type OutboxRowState = {
  created_at: Date | string
  sent_at: Date | string | null
  attempts: number
  /** Set by a failure (`transient`, `permanent`, `config`); as stored, a string. */
  failure_kind: OsRenderFailure["kind"] | string | null
  alerted_at: Date | string | null
}

/** What happens after a failed try: the next time, or none (report instead). */
export const afterFailure = (
  failure: OsRenderFailure,
  attempts: number,
  now: Date
): { next_attempt_at: Date | null; failure_kind: OsRenderFailure["kind"] } => ({
  next_attempt_at:
    failure.kind === "transient" ? new Date(now.getTime() + retryDelayMinutes(attempts) * MINUTE_MS) : null,
  failure_kind: failure.kind,
})

/** Stuck: not sent, and either cannot be sent by retrying, or an hour has passed. */
export const isStuck = (row: OutboxRowState, now: Date): boolean =>
  !row.sent_at &&
  (row.failure_kind === "permanent" ||
    row.failure_kind === "config" ||
    now.getTime() - new Date(row.created_at).getTime() >= OUTBOX_STUCK_AFTER_MS)

/** Report a stuck mail once. */
export const needsAlert = (row: OutboxRowState, now: Date): boolean => isStuck(row, now) && !row.alerted_at
