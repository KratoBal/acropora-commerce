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

type Listed = { rows: unknown[]; switchOff: { count: number; latest: Date | null }; total: number }
const none = (): Listed => ({ rows: [], switchOff: { count: 0, latest: null }, total: 0 })
const listed = (rows: unknown[], switchOff = { count: 0, latest: null as Date | null }): Listed => ({
  rows,
  switchOff,
  total: rows.length + (switchOff.count > 0 ? 1 : 0),
})

const world = (opts: { record?: jest.Mock; unsent?: Listed; outbox?: unknown[]; noLogger?: boolean } = {}) => {
  const info: string[] = []
  const warn: string[] = []
  const record = opts.record ?? jest.fn(async () => true)
  const container = {
    resolve: (key: string) => {
      if (key === "logger") {
        if (opts.noLogger) throw new Error("no logger")
        return { info: (m: string) => info.push(m), warn: (m: string) => warn.push(m) }
      }
      if (key === NEWSLETTER_MODULE) return { recordConfirmationMailResult: record, listUnsentConfirmations: async () => opts.unsent ?? none() }
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

const outboxRow = {
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
}

describe("unsentNewsletterConfirmations and the OS's list of mails that did not go", () => {
  it("a failure or an environment reason is an item shaped like an outbox one: config for the environment, permanent for a failure, the cause as the error", async () => {
    const w = world({ unsent: listed([unsentRow({ result: "mail_off" }), unsentRow({ id: "nlsub_10", result: "failed" })]) })
    const { items, total } = await unsentNewsletterConfirmations(w.container, NOW)
    expect(total).toBe(2)
    expect(items[0]).toEqual({
      id: "nlsub_9",
      template: "newsletter-confirm",
      display_id: null,
      resource_id: "nlsub_9",
      to: "vevo@example.test",
      attempts: 1,
      failure_kind: "config",
      last_error: NEWSLETTER_MAIL_NOT_SENT_WHY.mail_off,
      created_at: "2026-11-24T18:01:57.000Z",
      next_attempt_at: null,
      alerted_at: null,
    })
    expect(items[1]).toMatchObject({ id: "nlsub_10", failure_kind: "permanent" })
  })

  it("the switch being off is ONE summary item with the count, never a row per sign-up (it is the default until the text is approved)", async () => {
    const latest = new Date("2026-11-24T18:20:00.000Z")
    const w = world({ unsent: listed([], { count: 57, latest }) })
    const { items, total } = await unsentNewsletterConfirmations(w.container, NOW)
    expect(total).toBe(1)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: "newsletter-confirm-switch-off",
      template: "newsletter-confirm",
      to: "",
      failure_kind: "config",
      created_at: latest.toISOString(),
    })
    expect(items[0]!.last_error).toContain("57 pending sign-up(s)")
    expect(items[0]!.last_error).toContain("ACROPORA_NEWSLETTER_CONFIRM_MAIL")
  })

  it("the list the fleet reads shows them beside the outbox's own items, newest first, and the count stays TRUE when the rows listed are capped", async () => {
    const w = world({
      outbox: [outboxRow],
      unsent: { ...listed([unsentRow(), unsentRow({ id: "nlsub_10", at: new Date("2026-11-24T18:20:00.000Z") })]), total: 450 },
    })
    const all = await stuckWebshopMails(w.container, { limit: 50, offset: 0 }, NOW)
    expect(all.items.map((item) => item.id)).toEqual(["nlsub_10", "wmout_1", "nlsub_9"])
    expect(all.count).toBe(451)
    const page = await stuckWebshopMails(w.container, { limit: 1, offset: 1 }, NOW)
    expect(page.items).toEqual([expect.objectContaining({ id: "wmout_1" })])
  })

  it("a failed newsletter read is LOGGED (an empty list that is really a failed read looks like 'nothing unsent': measured 2026-11-24)", async () => {
    const warnings: string[] = []
    const broken = {
      resolve: (key: string) => {
        if (key === "logger") return { warn: (message: string) => warnings.push(message), info: () => undefined }
        if (key === NEWSLETTER_MODULE) return { listUnsentConfirmations: async () => Promise.reject(new Error("column does not exist")) }
        return { listWebshopMailOutboxes: async () => [] }
      },
    } as never
    expect(await unsentNewsletterConfirmations(broken, NOW)).toEqual({ items: [], total: 0 })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("could not be read")
    expect(warnings[0]).toContain("column does not exist")
  })

  it("with nothing unsent, or a newsletter read that fails, the outbox's own list is exactly what it was", async () => {
    const empty = await stuckWebshopMails(world({ outbox: [outboxRow] }).container, { limit: 50, offset: 0 }, NOW)
    expect(empty).toEqual({ count: 1, items: [expect.objectContaining({ id: "wmout_1" })] })
    const broken = {
      resolve: (key: string) => {
        if (key === NEWSLETTER_MODULE) throw new Error("no such module")
        return { listWebshopMailOutboxes: async () => [outboxRow] }
      },
    } as never
    expect(await stuckWebshopMails(broken, { limit: 50, offset: 0 }, NOW)).toEqual({
      count: 1,
      items: [expect.objectContaining({ id: "wmout_1" })],
    })
  })
})
