import type { OsRenderResult } from "../os-mail-render"
import {
  type MailRenderFacts,
  type OutboxOperations,
  type OutboxRow,
  deliverThroughOutbox,
  runOutbox,
} from "../outbox-delivery"
import type { MailToSend } from "../prepare"

const T0 = new Date("2026-10-05T20:00:00.000Z")
const RENDERED: OsRenderResult = {
  ok: true,
  subject: "Tárgy",
  html: "<p>Szia</p>",
  text: "Szia",
  customized: false,
}

type Row = OutboxRow & {
  next_attempt_at?: Date | null
  last_error?: string | null
}

const fakeOps = (renders: OsRenderResult[] = [RENDERED]) => {
  const rows: Row[] = []
  const sent: MailToSend[] = []
  let clock = T0
  const ops: OutboxOperations & { sendError?: Error } = {
    findByKey: async (key) => rows.find((r) => r.idempotency_key === key) ?? null,
    create: async (row) => {
      const created: Row = {
        ...row,
        id: `wmout_${rows.length + 1}`,
        created_at: clock,
        sent_at: null,
        failure_kind: null,
        alerted_at: null,
      }
      rows.push(created)
      return { ...created }
    },
    update: async (id, changes) => {
      Object.assign(
        rows.find((r) => r.id === id)!,
        changes
      )
    },
    loadCommon: jest.fn(async () => ({
      customer_name: "Próba Vevő",
      order_created_at: "2026-10-05T19:00:00.000Z",
    })),
    render: jest.fn(async () => renders.shift() ?? RENDERED),
    send: async (mail) => {
      if (ops.sendError) throw ops.sendError
      sent.push(mail)
    },
    now: () => clock,
  }
  return {
    ops,
    rows,
    sent,
    tick: (minutes: number) => (clock = new Date(clock.getTime() + minutes * 60_000)),
  }
}

const mail = (key = "order-status:order_42:h1"): MailToSend & { render: MailRenderFacts } =>
  ({
    to: "vevo@example.test",
    template: "order-status-confirmed",
    trigger: "order-status:h1",
    idempotency_key: key,
    resource_id: "order_42",
    content: {
      subject: "beépített",
      html: "<p>beépített</p>",
      text: "beépített",
    },
    render: {
      template: "order-status-confirmed",
      facts: { order: { id: "order_42", display_id: 42 } },
    },
  }) as never

describe("deliverThroughOutbox", () => {
  it("stores the common facts with the builder's, renders, and sends the OS's text under the mail's own key", async () => {
    const { ops, rows, sent } = fakeOps()
    expect(await deliverThroughOutbox(mail(), ops)).toEqual({ sent: true })
    expect(ops.render).toHaveBeenCalledWith({
      template: "order-status-confirmed",
      facts_version: 1,
      facts: {
        customer_name: "Próba Vevő",
        order_created_at: "2026-10-05T19:00:00.000Z",
        order: { id: "order_42", display_id: 42 },
      },
    })
    expect(sent).toEqual([
      {
        to: "vevo@example.test",
        template: "order-status-confirmed",
        trigger: "order-status:h1",
        idempotency_key: "order-status:order_42:h1",
        resource_id: "order_42",
        content: { subject: "Tárgy", html: "<p>Szia</p>", text: "Szia" },
      },
    ])
    expect(rows[0]).toMatchObject({
      attempts: 1,
      sent_at: T0,
      failure_kind: null,
      last_error: null,
    })
  })

  it("a mail already sent is not rendered or sent again", async () => {
    const { ops, sent } = fakeOps()
    await deliverThroughOutbox(mail(), ops)
    expect(await deliverThroughOutbox(mail(), ops)).toEqual({ sent: true })
    expect(ops.render).toHaveBeenCalledTimes(1)
    expect(sent).toHaveLength(1)
  })

  it("an OS that cannot render now queues the mail: no built-in text goes, the next try is due in 2 minutes", async () => {
    const { ops, rows, sent } = fakeOps([{ ok: false, kind: "transient", message: "Az OS nem válaszolt időben." }])
    expect(await deliverThroughOutbox(mail(), ops)).toEqual({
      sent: false,
      queued: true,
      reason: "Az OS nem válaszolt időben.",
    })
    expect(sent).toEqual([])
    expect(rows[0]).toMatchObject({
      attempts: 1,
      sent_at: null,
      failure_kind: "transient",
      last_error: "Az OS nem válaszolt időben.",
      next_attempt_at: new Date(T0.getTime() + 2 * 60_000),
    })
  })

  it("a waiting mail fired again gets no second row: the same row is tried", async () => {
    const { ops, rows, sent } = fakeOps([{ ok: false, kind: "transient", message: "5xx" }])
    await deliverThroughOutbox(mail(), ops)
    expect(await deliverThroughOutbox(mail(), ops)).toEqual({ sent: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ attempts: 2, failure_kind: null })
    expect(sent).toHaveLength(1)
  })

  it("a template the OS cannot render is not retried on a timer", async () => {
    const { ops, rows } = fakeOps([{ ok: false, kind: "permanent", message: "Ismeretlen változó: {{x}}" }])
    await deliverThroughOutbox(mail(), ops)
    expect(rows[0]).toMatchObject({
      failure_kind: "permanent",
      next_attempt_at: null,
      last_error: "Ismeretlen változó: {{x}}",
    })
  })

  it("a failing mail provider queues the mail on the transient cadence instead of throwing", async () => {
    const { ops, rows } = fakeOps()
    ops.sendError = new Error("provider down")
    const result = await deliverThroughOutbox(mail(), ops)
    expect(result).toEqual({
      sent: false,
      queued: true,
      reason: "A levél küldése nem sikerült: provider down",
    })
    expect(rows[0]).toMatchObject({
      attempts: 1,
      sent_at: null,
      failure_kind: "transient",
      next_attempt_at: new Date(T0.getTime() + 2 * 60_000),
    })
  })
})

describe("runOutbox", () => {
  const job = (f: ReturnType<typeof fakeOps>, reported: OutboxRow[]) => ({
    ...f.ops,
    due: async (now: Date) =>
      f.rows.filter((r) => !r.sent_at && r.failure_kind === "transient" && r.next_attempt_at! <= now),
    unsentToReport: async () => f.rows.filter((r) => !r.sent_at && !r.alerted_at),
    report: (row: OutboxRow) => reported.push(row),
  })

  it("tries the due rows and sends what the OS now renders", async () => {
    const f = fakeOps([{ ok: false, kind: "transient", message: "5xx" }])
    await deliverThroughOutbox(mail(), f.ops)
    f.tick(2)
    const reported: OutboxRow[] = []
    expect(await runOutbox(job(f, reported))).toEqual({
      tried: 1,
      sent: 1,
      reported: 0,
    })
    expect(f.sent).toHaveLength(1)
    expect(reported).toEqual([])
  })

  it("a row not yet due is left alone", async () => {
    const f = fakeOps([{ ok: false, kind: "transient", message: "5xx" }])
    await deliverThroughOutbox(mail(), f.ops)
    f.tick(1)
    expect(await runOutbox(job(f, []))).toEqual({
      tried: 0,
      sent: 0,
      reported: 0,
    })
  })

  it("a permanent failure is reported at once, and only once", async () => {
    const f = fakeOps([{ ok: false, kind: "permanent", message: "422" }])
    await deliverThroughOutbox(mail(), f.ops)
    const reported: OutboxRow[] = []
    expect((await runOutbox(job(f, reported))).reported).toBe(1)
    expect(f.rows[0].alerted_at).toEqual(T0)
    expect((await runOutbox(job(f, reported))).reported).toBe(0)
    expect(reported).toHaveLength(1)
  })

  it("a transient failure is reported only after an hour unsent", async () => {
    const renders: OsRenderResult[] = Array.from(
      { length: 20 },
      () => ({ ok: false, kind: "transient", message: "5xx" }) as const
    )
    const f = fakeOps(renders)
    await deliverThroughOutbox(mail(), f.ops)
    const reported: OutboxRow[] = []
    f.tick(59)
    expect((await runOutbox(job(f, reported))).reported).toBe(0)
    f.tick(1)
    expect((await runOutbox(job(f, reported))).reported).toBe(1)
  })
})
