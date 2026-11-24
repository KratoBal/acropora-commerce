import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import { WEBSHOP_MAIL_OUTBOX_MODULE } from "../../../../modules/webshop-mail-outbox"
import { stuckWebshopMails } from "../deliver"
import { newsletterMailResultOf, recordNewsletterConfirmOutcome } from "../newsletter-confirm-mail"
import { NEWSLETTER_MAIL_NOT_SENT_WHY } from "../newsletter-mail-why"
import { unsentNewsletterConfirmations } from "../newsletter-unsent"

/*
  WHAT TURNS THIS RED (task hirlevel-level-eredmeny-20261124; measured on the test shop 2026-11-24: three sign-ups, one mail, and nothing
  anywhere to say why): a confirmation mail that does not go leaving no result on the row and no line in the log; an address or a token
  in that line; the result not saying WHAT is off; a failed recording throwing out of the sign-up; the OS's list of mails that did not go
  not showing an unsent confirmation (it never reaches the outbox), showing one whose mail did go, or losing the outbox's own items.
*/
const SENT_AT = new Date("2026-11-24T18:01:57.000Z")
const NOW = new Date("2026-11-24T18:30:00.000Z")

const world = (opts: { record?: jest.Mock; unsent?: unknown[]; outbox?: unknown[]; noLogger?: boolean } = {}) => {
  const info: string[] = []
  const warn: string[] = []
  const record = opts.record ?? jest.fn(async () => true)
  const container = {
    resolve: (key: string) => {
      if (key === "logger") {
        if (opts.noLogger) throw new Error("no logger")
        return { info: (m: string) => info.push(m), warn: (m: string) => warn.push(m) }
      }
      if (key === NEWSLETTER_MODULE) return { recordConfirmationMailResult: record, listUnsentConfirmations: async () => opts.unsent ?? [] }
      if (key === WEBSHOP_MAIL_OUTBOX_MODULE) return { listWebshopMailOutboxes: async () => opts.outbox ?? [] }
      throw new Error(`unexpected ${key}`)
    },
  } as never
  return { container, info, warn, record }
}

describe("newsletterMailResultOf", () => {
  it("maps what the sender answered to the result the row keeps", () => {
    expect(newsletterMailResultOf({ sent: true })).toBe("sent")
    for (const reason of ["switch_off", "mail_off", "os_renderer_off", "no_storefront_url", "queued", "failed"] as const)
      expect(newsletterMailResultOf({ sent: false, reason })).toBe(reason)
  })
})

describe("recordNewsletterConfirmOutcome", () => {
  it("a mail that did not go is recorded on the row AND said in the log, naming what is off", async () => {
    const w = world()
    await recordNewsletterConfirmOutcome(w.container, { id: "nlsub_1", sentAt: SENT_AT }, { sent: false, reason: "switch_off" })
    expect(w.record).toHaveBeenCalledWith("nlsub_1", SENT_AT, "switch_off")
    expect(w.warn).toHaveLength(1)
    expect(w.warn[0]).toContain("nlsub_1")
    expect(w.warn[0]).toContain("NOT sent (switch_off)")
    expect(w.warn[0]).toContain("ACROPORA_NEWSLETTER_CONFIRM_MAIL")
    expect(w.info).toEqual([])
  })

  it("a mail that went or waits in the outbox is recorded and logged as information, not as a warning", async () => {
    for (const outcome of [{ sent: true }, { sent: false, reason: "queued" }] as const) {
      const w = world()
      await recordNewsletterConfirmOutcome(w.container, { id: "nlsub_1", sentAt: SENT_AT }, outcome)
      expect(w.warn).toEqual([])
      expect(w.info).toHaveLength(1)
      expect(w.record).toHaveBeenCalledWith("nlsub_1", SENT_AT, outcome.sent ? "sent" : "queued")
    }
  })

  it("every way of not going has its own sentence, and none carries an address or a token", async () => {
    for (const reason of ["switch_off", "mail_off", "os_renderer_off", "no_storefront_url", "failed"] as const) {
      const w = world()
      await recordNewsletterConfirmOutcome(w.container, { id: "nlsub_1", sentAt: SENT_AT }, { sent: false, reason })
      expect(w.warn[0]).toContain(NEWSLETTER_MAIL_NOT_SENT_WHY[reason])
      expect(w.warn[0]).not.toMatch(/@|token=|[A-Za-z0-9_-]{43}/)
    }
    expect(new Set(Object.values(NEWSLETTER_MAIL_NOT_SENT_WHY)).size).toBe(5)
  })

  it("never throws: a failed recording is logged with the result, a missing logger changes nothing", async () => {
    const failing = world({ record: jest.fn(async () => Promise.reject(new Error("db down"))) })
    await expect(
      recordNewsletterConfirmOutcome(failing.container, { id: "nlsub_1", sentAt: SENT_AT }, { sent: false, reason: "mail_off" })
    ).resolves.toBeUndefined()
    expect(failing.warn.some((line) => line.includes("could not be recorded") && line.includes("mail_off"))).toBe(true)
    const dark = world({ noLogger: true })
    await expect(
      recordNewsletterConfirmOutcome(dark.container, { id: "nlsub_1", sentAt: SENT_AT }, { sent: true })
    ).resolves.toBeUndefined()
    expect(dark.record).toHaveBeenCalled()
  })
})

const unsentRow = (over: Record<string, unknown> = {}) => ({
  id: "nlsub_9",
  email: "vevo@example.test",
  result: "switch_off",
  at: new Date("2026-11-24T18:01:57.000Z"),
  ...over,
})

describe("unsentNewsletterConfirmations and the OS's list of mails that did not go", () => {
  it("an unsent confirmation is an item shaped like an outbox one: config for the environment, permanent for a failure, the cause as the error", async () => {
    const w = world({ unsent: [unsentRow(), unsentRow({ id: "nlsub_10", result: "failed" })] })
    const items = await unsentNewsletterConfirmations(w.container, NOW)
    expect(items[0]).toEqual({
      id: "nlsub_9",
      template: "newsletter-confirm",
      display_id: null,
      resource_id: "nlsub_9",
      to: "vevo@example.test",
      attempts: 1,
      failure_kind: "config",
      last_error: NEWSLETTER_MAIL_NOT_SENT_WHY.switch_off,
      created_at: "2026-11-24T18:01:57.000Z",
      next_attempt_at: null,
      alerted_at: null,
    })
    expect(items[1]).toMatchObject({ id: "nlsub_10", failure_kind: "permanent" })
  })

  it("the list the fleet reads shows them beside the outbox's own items, newest first, counted and paged together", async () => {
    const outbox = [
      {
        id: "wmout_1",
        template: "order-status-confirmed",
        resource_id: "order_1",
        to: "x@example.test",
        attempts: 1,
        facts: {},
        failure_kind: "permanent",
        sent_at: null,
        alerted_at: null,
        created_at: new Date("2026-11-24T18:10:00.000Z"),
      },
    ]
    const w = world({ outbox, unsent: [unsentRow(), unsentRow({ id: "nlsub_10", at: new Date("2026-11-24T18:20:00.000Z") })] })
    const all = await stuckWebshopMails(w.container, { limit: 50, offset: 0 }, NOW)
    expect(all.count).toBe(3)
    expect(all.items.map((item) => item.id)).toEqual(["nlsub_10", "wmout_1", "nlsub_9"])
    const page = await stuckWebshopMails(w.container, { limit: 1, offset: 1 }, NOW)
    expect(page).toEqual({ count: 3, items: [expect.objectContaining({ id: "wmout_1" })] })
  })

  it("with nothing unsent, or a newsletter read that fails, the outbox's own list is exactly what it was", async () => {
    const outbox = [
      {
        id: "wmout_1",
        template: "order-status-confirmed",
        resource_id: "order_1",
        to: "x@example.test",
        attempts: 1,
        facts: {},
        failure_kind: "permanent",
        sent_at: null,
        alerted_at: null,
        created_at: new Date("2026-11-24T18:10:00.000Z"),
      },
    ]
    const empty = await stuckWebshopMails(world({ outbox }).container, { limit: 50, offset: 0 }, NOW)
    expect(empty.items.map((item) => item.id)).toEqual(["wmout_1"])
    const broken = {
      resolve: (key: string) => {
        if (key === NEWSLETTER_MODULE) throw new Error("no such module")
        return { listWebshopMailOutboxes: async () => outbox }
      },
    } as never
    expect((await stuckWebshopMails(broken, { limit: 50, offset: 0 }, NOW)).items.map((item) => item.id)).toEqual(["wmout_1"])
  })
})
