import webshopMailOutboxJob from "../../../../jobs/webshop-mail-outbox"
import { POST as retryRoute } from "../../../../api/admin/webshop-mail/outbox/[id]/retry/route"
import { GET as outboxRoute } from "../../../../api/admin/webshop-mail/outbox/route"
import { AdminGetWebshopMailOutboxParams } from "../../../../api/admin/webshop-mail/outbox/validators"
import middlewares from "../../../../api/middlewares"
import { WEBSHOP_MAIL_OUTBOX_MODULE } from "../../../../modules/webshop-mail-outbox"
import { deliverShopMail, displayIdOf, requeueWebshopMail, runWebshopMailOutbox, stuckWebshopMails } from "../deliver"
import type { OutboxRow } from "../outbox-delivery"
import type { MailToSend } from "../prepare"

const OS = {
  ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
  ACROPORA_OS_MAIL_RENDER_URL: "https://os.example.test/integrations/webshop-mail/render",
  ACROPORA_OS_MAIL_TOKEN: "proba-token-nem-valodi",
}

type Row = OutboxRow & {
  next_attempt_at?: Date | null
  last_error?: string | null
}

const world = () => {
  const rows: Row[] = []
  const notifications: Array<Record<string, unknown>> = []
  const warnings: string[] = []
  const outbox = {
    listWebshopMailOutboxes: jest.fn(async (filters: Record<string, unknown>) =>
      rows
        .filter((r) => Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((r) => ({ ...r }))
    ),
    createWebshopMailOutboxes: jest.fn(async (data: Record<string, unknown>) => {
      const row = {
        id: `wmout_${rows.length + 1}`,
        created_at: new Date(),
        sent_at: null,
        failure_kind: null,
        alerted_at: null,
        ...data,
      } as Row
      rows.push(row)
      return { ...row }
    }),
    updateWebshopMailOutboxes: jest.fn(async ({ id, ...changes }: Record<string, unknown>) => {
      Object.assign(
        rows.find((r) => r.id === id)!,
        changes
      )
    }),
  }
  const container = {
    resolve: (key: string) => {
      if (key === WEBSHOP_MAIL_OUTBOX_MODULE) return outbox
      if (key === "notification")
        return {
          createNotifications: async (n: Record<string, unknown>) => notifications.push(n),
        }
      if (key === "query")
        return {
          graph: async () => ({
            data: [
              {
                created_at: "2026-10-05T19:00:00.000Z",
                billing_address: { first_name: "Vevő", last_name: "Próba" },
              },
            ],
          }),
        }
      if (key === "logger")
        return {
          warn: (m: string) => warnings.push(m),
          info: () => {},
          error: () => {},
        }
      throw new Error(`unexpected resolve ${key}`)
    },
  }
  const row = (fields: Partial<Row>): Row => {
    const r = {
      id: `wmout_${rows.length + 1}`,
      template: "order-status-confirmed",
      facts: { order: { display_id: 42 } },
      facts_version: 1,
      to: "vevo@example.test",
      resource_id: "order_42",
      idempotency_key: `k${rows.length + 1}`,
      trigger_type: null,
      attempts: 1,
      created_at: new Date(),
      sent_at: null,
      failure_kind: null,
      alerted_at: null,
      next_attempt_at: null,
      last_error: null,
      ...fields,
    } as Row
    rows.push(r)
    return r
  }
  return {
    rows,
    notifications,
    warnings,
    outbox,
    container: container as never,
    row,
  }
}

const mail: MailToSend = {
  to: "vevo@example.test",
  template: "order-status-confirmed",
  trigger: "order-status:h1",
  idempotency_key: "order-status:order_42:h1",
  resource_id: "order_42",
  content: {
    subject: "beépített tárgy",
    html: "<p>beépített</p>",
    text: "beépített",
  },
  render: {
    template: "order-status-confirmed",
    facts: { order: { display_id: 42 } as never },
  },
}

const osAnswers = (status: number, body: unknown) =>
  jest.spyOn(global, "fetch").mockImplementation(async () => ({ status, json: async () => body }) as Response)

afterEach(() => jest.restoreAllMocks())

describe("deliverShopMail", () => {
  it("with the switch off, the built-in text goes as before and the outbox is not touched", async () => {
    const w = world()
    const fetch = osAnswers(200, {})
    expect(await deliverShopMail(w.container, mail, {})).toEqual({
      sent: true,
    })
    expect(w.notifications).toEqual([
      expect.objectContaining({
        content: mail.content,
        idempotency_key: mail.idempotency_key,
      }),
    ])
    expect(w.outbox.createWebshopMailOutboxes).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("with the switch on, the OS's text goes, through the outbox, with the customer's name in Hungarian order", async () => {
    const w = world()
    const fetch = osAnswers(200, {
      subject: "OS tárgy",
      html: "<p>OS</p>",
      text: "OS",
      customized: true,
    })
    expect(await deliverShopMail(w.container, mail, OS)).toEqual({
      sent: true,
    })
    expect(w.notifications).toEqual([
      expect.objectContaining({
        content: { subject: "OS tárgy", html: "<p>OS</p>", text: "OS" },
        idempotency_key: mail.idempotency_key,
      }),
    ])
    const [url, init] = fetch.mock.calls[0] as [string, { body: string; headers: Record<string, string> }]
    expect(url).toBe(OS.ACROPORA_OS_MAIL_RENDER_URL)
    expect(JSON.parse(init.body)).toEqual({
      template: "order-status-confirmed",
      facts_version: 1,
      facts: {
        customer_name: "Próba Vevő",
        order_created_at: "2026-10-05T19:00:00.000Z",
        order: { display_id: 42 },
      },
    })
    expect(w.rows[0].sent_at).toBeInstanceOf(Date)
  })

  it("with the switch on and the OS down, nothing goes: the mail waits", async () => {
    const w = world()
    osAnswers(503, { message: "Karbantartás" })
    expect(await deliverShopMail(w.container, mail, OS)).toEqual({
      sent: false,
      queued: true,
      reason: "Karbantartás",
    })
    expect(w.notifications).toEqual([])
    expect(w.rows[0]).toMatchObject({
      failure_kind: "transient",
      sent_at: null,
    })
  })

  it("a mail without render facts keeps the built-in path even with the switch on", async () => {
    const w = world()
    expect(await deliverShopMail(w.container, { ...mail, render: undefined }, OS)).toEqual({ sent: true })
    expect(w.outbox.createWebshopMailOutboxes).not.toHaveBeenCalled()
  })
})

describe("runWebshopMailOutbox", () => {
  it("tries a due transient row and an abandoned first try, but not a waiting, permanent or fresh one", async () => {
    const w = world()
    const now = Date.now()
    const due = w.row({
      failure_kind: "transient",
      next_attempt_at: new Date(now - 1000),
    })
    w.row({
      failure_kind: "transient",
      next_attempt_at: new Date(now + 60_000),
    })
    w.row({
      failure_kind: "permanent",
      created_at: new Date(now - 10 * 60_000),
    })
    const abandoned = w.row({
      failure_kind: null,
      created_at: new Date(now - 3 * 60_000),
    })
    w.row({ failure_kind: null, created_at: new Date(now - 30_000) })
    osAnswers(200, { subject: "S", html: "<p>H</p>", text: "T" })
    const result = await runWebshopMailOutbox(w.container, OS)
    expect(result.tried).toBe(2)
    expect(result.sent).toBe(2)
    // oldest first: the abandoned try was created before the due one
    expect(w.notifications.map((n) => n.idempotency_key)).toEqual([abandoned.idempotency_key, due.idempotency_key])
  })

  it("reports a stuck mail once, in the log, with the OS's words", async () => {
    const w = world()
    w.row({
      failure_kind: "permanent",
      last_error: "Ismeretlen változó: {{kupon}}",
    })
    await runWebshopMailOutbox(w.container, OS)
    await runWebshopMailOutbox(w.container, OS)
    expect(w.warnings).toHaveLength(1)
    expect(w.warnings[0]).toContain("Ismeretlen változó: {{kupon}}")
    expect(w.rows[0].alerted_at).toBeInstanceOf(Date)
  })
})

describe("the outbox job", () => {
  it("does nothing with the switch off", async () => {
    const w = world()
    const env = process.env
    process.env = { ...env, ACROPORA_WEBSHOP_MAIL_RENDERER: "" }
    try {
      await webshopMailOutboxJob(w.container)
    } finally {
      process.env = env
    }
    expect(w.outbox.listWebshopMailOutboxes).not.toHaveBeenCalled()
  })
})

describe("the stuck mails (GET /admin/webshop-mail/outbox?stuck=true)", () => {
  it("lists permanent, config and hour-old unsent mails, newest first, paged; count is all of them", async () => {
    const w = world()
    const now = new Date("2026-10-05T22:00:00.000Z")
    const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)
    w.row({
      failure_kind: "transient",
      created_at: minutesAgo(90),
      facts: { shipped: { display_id: 7 } },
    })
    w.row({
      failure_kind: "permanent",
      created_at: minutesAgo(5),
      last_error: "422",
      facts: { orders: [{ display_id: 8 }] },
    })
    w.row({ failure_kind: "config", created_at: minutesAgo(3) })
    w.row({ failure_kind: "transient", created_at: minutesAgo(10) })
    w.row({
      failure_kind: null,
      created_at: minutesAgo(120),
      sent_at: minutesAgo(119),
    })

    const all = await stuckWebshopMails(w.container, { limit: 50, offset: 0 }, now)
    expect(all.count).toBe(3)
    expect(all.items.map((i) => i.id)).toEqual(["wmout_3", "wmout_2", "wmout_1"])
    expect(all.items[1]).toEqual({
      id: "wmout_2",
      template: "order-status-confirmed",
      display_id: 8,
      resource_id: "order_42",
      to: "vevo@example.test",
      attempts: 1,
      failure_kind: "permanent",
      last_error: "422",
      created_at: minutesAgo(5).toISOString(),
      next_attempt_at: null,
      alerted_at: null,
    })
    const page = await stuckWebshopMails(w.container, { limit: 1, offset: 1 }, now)
    expect(page).toEqual({
      count: 3,
      items: [expect.objectContaining({ id: "wmout_2" })],
    })
  })

  it("the query: stuck=true is required, the page is bounded, nothing else is accepted", () => {
    expect(AdminGetWebshopMailOutboxParams.parse({ stuck: "true" })).toEqual({
      stuck: "true",
      limit: 50,
      offset: 0,
    })
    expect(AdminGetWebshopMailOutboxParams.safeParse({}).success).toBe(false)
    expect(AdminGetWebshopMailOutboxParams.safeParse({ stuck: "false" }).success).toBe(false)
    expect(AdminGetWebshopMailOutboxParams.safeParse({ stuck: "true", limit: "101" }).success).toBe(false)
    expect(AdminGetWebshopMailOutboxParams.safeParse({ stuck: "true", sent: "true" }).success).toBe(false)
  })

  it("the route is validated and answers { items, count }", async () => {
    const route = (middlewares.routes ?? []).find((r) => r.matcher === "/admin/webshop-mail/outbox")
    expect(route?.middlewares).toHaveLength(1)
    const w = world()
    w.row({ failure_kind: "permanent" })
    const json = jest.fn()
    await outboxRoute(
      {
        scope: w.container,
        validatedQuery: { stuck: "true", limit: 50, offset: 0 },
      } as never,
      { json } as never
    )
    expect(json).toHaveBeenCalledWith({
      count: 1,
      items: [expect.objectContaining({ id: "wmout_1" })],
    })
  })

  it("the display number is found in every template's facts", () => {
    expect(displayIdOf({ order: { display_id: 1 } })).toBe(1)
    expect(displayIdOf({ shipped: { display_id: 2 } })).toBe(2)
    expect(displayIdOf({ refund: { display_id: 3 } })).toBe(3)
    expect(displayIdOf({ orders: [{ display_id: 4 }, { display_id: 5 }] })).toBe(4)
    expect(displayIdOf({})).toBeNull()
  })
})

describe("the retry (POST /admin/webshop-mail/outbox/:id/retry)", () => {
  it("puts a stuck mail back in line: due now, reportable again", async () => {
    const w = world()
    const now = new Date("2026-10-05T22:00:00.000Z")
    w.row({
      failure_kind: "permanent",
      alerted_at: new Date("2026-10-05T21:00:00.000Z"),
      last_error: "422",
    })
    const result = await requeueWebshopMail(w.container, "wmout_1", now)
    expect(result).toEqual({
      status: "requeued",
      item: expect.objectContaining({
        id: "wmout_1",
        failure_kind: "transient",
        next_attempt_at: now.toISOString(),
        alerted_at: null,
      }),
    })
    expect(w.rows[0]).toMatchObject({
      failure_kind: "transient",
      next_attempt_at: now,
      alerted_at: null,
    })
  })

  it("answers 404 and 409 with a Hungarian message, and 200 with the row", async () => {
    const w = world()
    w.row({ failure_kind: null, sent_at: new Date() })
    w.row({ failure_kind: "permanent" })
    const call = async (id: string) => {
      const res = {
        statusCode: 200,
        body: undefined as unknown,
        status: jest.fn(),
        json: jest.fn(),
      }
      res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
      res.json.mockImplementation((body: unknown) => (res.body = body))
      await retryRoute({ scope: w.container, params: { id } } as never, res as never)
      return res
    }
    expect(await call("wmout_9")).toMatchObject({
      statusCode: 404,
      body: { message: "Nincs ilyen levél a webshop levél-sorában." },
    })
    expect(await call("wmout_1")).toMatchObject({
      statusCode: 409,
      body: { message: "Ez a levél már kiment, nem kell újra sorba tenni." },
    })
    expect(await call("wmout_2")).toMatchObject({
      statusCode: 200,
      body: expect.objectContaining({
        id: "wmout_2",
        failure_kind: "transient",
      }),
    })
  })
})
