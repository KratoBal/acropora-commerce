import { afterFailure, isStuck, needsAlert, retryDelayMinutes } from "../outbox-policy"

/**
 * THE OUTBOX'S RULES (Balázs, 2026-10-05 20:11 UTC). What must fail: retries
 * faster than every 2 minutes or slower than every 15; a permanent or config
 * failure retried on a timer instead of reported; a mail reported before an
 * hour without a reason, or never; a sent mail reported; a report twice.
 */
const NOW = new Date("2026-10-05T22:00:00.000Z")
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()
const row = (over: Record<string, unknown> = {}) => ({
  created_at: ago(10),
  sent_at: null,
  attempts: 1,
  failure_kind: "transient" as const,
  alerted_at: null,
  ...over,
})

describe("the outbox policy", () => {
  it("retries at 2, 4, 8, then every 15 minutes", () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelayMinutes)).toEqual([2, 4, 8, 15, 15, 15])
    expect(retryDelayMinutes(0)).toBe(2)
  })

  it("a transient failure is retried; a permanent or config one is not, it is reported", () => {
    expect(afterFailure({ kind: "transient", message: "x" }, 1, NOW).next_attempt_at).toEqual(new Date("2026-10-05T22:02:00.000Z"))
    for (const kind of ["permanent", "config"] as const) {
      expect(afterFailure({ kind, message: "x" }, 1, NOW)).toEqual({ next_attempt_at: null, failure_kind: kind })
      expect(isStuck(row({ failure_kind: kind }), NOW)).toBe(true)
    }
  })

  it("an hour unsent is stuck; a sent one never; a report goes once", () => {
    expect(isStuck(row({ created_at: ago(59) }), NOW)).toBe(false)
    expect(isStuck(row({ created_at: ago(60) }), NOW)).toBe(true)
    expect(isStuck(row({ created_at: ago(120), sent_at: ago(1) }), NOW)).toBe(false)
    expect(needsAlert(row({ created_at: ago(120) }), NOW)).toBe(true)
    expect(needsAlert(row({ created_at: ago(120), alerted_at: ago(5) }), NOW)).toBe(false)
  })
})
