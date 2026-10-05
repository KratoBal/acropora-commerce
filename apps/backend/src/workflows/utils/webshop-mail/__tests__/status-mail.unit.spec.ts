import type { LoadedOrder } from "../prepare"
import {
  isStatusMailStatus,
  prepareStatusMail,
  renderStatusMail,
  statusMailKey,
  type StatusMailStatus,
} from "../status-mail"
import { notifyStatusChange } from "../status-notify"
import {
  AdminResendOrderStatusNotification,
  AdminTransitionOrderBusinessStatus,
} from "../../../../api/admin/order-business-status/validators"
import middlewares from "../../../../api/middlewares"

/**
 * THE STATUS MAILS (Rendelések prompt, point 10). MI PIROSÍT: ha a Készletezés
 * alatt vagy a Sikertelenül lezárt kapna levelet; ha a Feldolgozásra vár a
 * visszaigazolás MELLETT második levelet kapna; ha a Kiszállítás a „Feladtuk”
 * levél mellé is menne; ha ugyanarra a változásra kétszer menne, de az
 * újraküldés NEM menne; ha nem forintban állna az összeg; ha kézbesítési
 * napot vagy nyitvatartást ígérne; ha a kikapcsolt csatornán menne; ha a
 * hibás küldés visszafordítaná vagy eldobná a választ.
 */
const NBSP = " "
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "a",
  GMAIL_WEBSHOP_CLIENT_SECRET: "b",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
}

const rendeles = (over: Partial<LoadedOrder> = {}): LoadedOrder => ({
  id: "order_42",
  display_id: 42,
  email: "vevo@example.test",
  total: 14000,
  items: [{ title: "Hanna HI780-25", quantity: 1, total: 10500 }],
  shipping: [{ name: "GLS házhozszállítás", amount: 3500 }],
  payment: "ONLINE_CARD",
  ...over,
})

const deps = (order: LoadedOrder | null, { sent = false, shipped = false } = {}) => ({
  loadOrder: jest.fn(async () => order),
  alreadySent: jest.fn(async () => sent),
  shippedMailSent: jest.fn(async () => shipped),
})

type Sent = { template: string; trigger?: string; idempotency_key: string; content: { subject: string; text: string; html: string } }
const mailOf = (result: unknown) => (result as { mail: Sent }).mail

describe("which statuses mail", () => {
  it("Visszaigazolva, Kiszállítás, Átvehető, Lezárva; Feldolgozásra vár is the order confirmation; the other two none", () => {
    expect(["confirmed", "out_for_delivery", "ready_for_pickup", "closed"].every(isStatusMailStatus)).toBe(true)
    expect(["pending_processing", "stocking", "closed_unsuccessfully"].some(isStatusMailStatus)).toBe(false)
  })

  it("a status without a mail of its own sends nothing", async () => {
    for (const status of ["stocking", "closed_unsuccessfully", "pending_processing"] as const) {
      const d = deps(rendeles())
      expect(await prepareStatusMail({ orderId: "order_42", status, historyId: "h1" }, d, ON)).toEqual({
        status: "skip",
        reason: "no_mail_for_status",
      })
      expect(d.loadOrder).not.toHaveBeenCalled()
    }
  })
})

describe("when a status mail goes", () => {
  it("one mail per change, keyed and triggered by the history row", async () => {
    const result = await prepareStatusMail({ orderId: "order_42", status: "confirmed", historyId: "h7" }, deps(rendeles()), ON)
    const mail = mailOf(result)
    expect(mail.template).toBe("order-status-confirmed")
    expect(mail.idempotency_key).toBe("order-status:order_42:h7")
    expect(mail.trigger).toBe("order-status:h7")
    expect(mail.content.subject).toBe("Visszaigazoltuk a rendelésedet (#42)")
  })

  it("not twice for the same change; a resend is a new key and goes even after a success", async () => {
    expect(
      await prepareStatusMail({ orderId: "order_42", status: "closed", historyId: "h9" }, deps(rendeles(), { sent: true }), ON)
    ).toEqual({ status: "skip", reason: "already_sent" })

    const resend = await prepareStatusMail(
      { orderId: "order_42", status: "closed", historyId: "h9", resendAt: 1759680000000 },
      deps(rendeles(), { sent: true }),
      ON
    )
    expect(mailOf(resend).idempotency_key).toBe(statusMailKey("order_42", "h9", 1759680000000))
    expect(mailOf(resend).idempotency_key).not.toBe(statusMailKey("order_42", "h9"))
    expect(mailOf(resend).trigger).toBe("order-status:h9")
  })

  it("Kiszállítás stands back when the Feladtuk mail already went, and only Kiszállítás does", async () => {
    expect(
      await prepareStatusMail(
        { orderId: "order_42", status: "out_for_delivery", historyId: "h3" },
        deps(rendeles(), { shipped: true }),
        ON
      )
    ).toEqual({ status: "skip", reason: "shipped_mail_sent" })
    const closed = await prepareStatusMail({ orderId: "order_42", status: "closed", historyId: "h4" }, deps(rendeles(), { shipped: true }), ON)
    expect(closed.status).toBe("send")
  })

  it("off, no address, no order: nothing", async () => {
    const input = { orderId: "order_42", status: "confirmed" as const, historyId: "h1" }
    expect(await prepareStatusMail(input, deps(rendeles()), {})).toEqual({ status: "skip", reason: "mail_off" })
    expect(await prepareStatusMail(input, deps(rendeles({ email: "  " })), ON)).toEqual({ status: "skip", reason: "no_email" })
    expect(await prepareStatusMail(input, deps(null), ON)).toEqual({ status: "skip", reason: "order_missing" })
  })
})

describe("what a status mail says", () => {
  const all: StatusMailStatus[] = ["confirmed", "out_for_delivery", "ready_for_pickup", "closed"]

  it("the amounts in forint, grouped; the order number; the shop's address", () => {
    for (const status of all) {
      const { text, html } = renderStatusMail(status, rendeles())
      expect(text).toContain("Rendelés: #42")
      expect(text).toContain(`Végösszeg: 14${NBSP}000 Ft`)
      expect(text).toContain(`Szállítás: GLS házhozszállítás, 3${NBSP}500 Ft`)
      expect(text).toContain("webshop@acropora.hu")
      expect(text).not.toMatch(/HUF/)
      expect(html).toContain("Hanna HI780-25 × 1")
    }
  })

  it("promises no day, no hours, no further mail", () => {
    for (const status of all) {
      const { text } = renderStatusMail(status, rendeles())
      expect(text).not.toMatch(/holnap|munkanap|napon belül|nyitva|nyitvatartás|értesítünk|órá(n|ig)/i)
    }
  })

  it("the amount due only where it is still due: cash on delivery on the way, pay at the shop on collection", () => {
    const due = (status: StatusMailStatus, payment: LoadedOrder["payment"]) =>
      renderStatusMail(status, rendeles({ payment })).text.includes(`ÁTVÉTELKOR FIZETENDŐ: 14${NBSP}000 Ft`)
    expect(due("out_for_delivery", "COD")).toBe(true)
    expect(due("ready_for_pickup", "PAY_AT_STORE")).toBe(true)
    expect(due("out_for_delivery", "ONLINE_CARD")).toBe(false)
    expect(due("ready_for_pickup", "ONLINE_CARD")).toBe(false)
    expect(due("closed", "COD")).toBe(false)
    expect(due("confirmed", "PAY_AT_STORE")).toBe(false)
  })

  it("the subjects", () => {
    expect(all.map((status) => renderStatusMail(status, rendeles()).subject)).toEqual([
      "Visszaigazoltuk a rendelésedet (#42)",
      "Úton van a rendelésed (#42)",
      "Átvehető a rendelésed (#42)",
      "Köszönjük a vásárlást (#42)",
    ])
  })

  it("escapes catalogue text in the HTML", () => {
    const { html } = renderStatusMail("confirmed", rendeles({ items: [{ title: "<b>x</b>", quantity: 1, total: 1 }] }))
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;")
    expect(html).not.toContain("<b>x</b>")
  })
})

describe("notifyStatusChange", () => {
  const container = (notification: { createNotifications: jest.Mock; listNotifications: jest.Mock }, order: unknown) => {
    const errors: string[] = []
    return {
      errors,
      scope: {
        resolve: (key: string) => {
          if (key === "logger") return { error: (m: string) => errors.push(m), info: () => {} }
          if (key === "notification") return notification
          if (key === "query") return { graph: async () => ({ data: order ? [order] : [] }) }
          throw new Error(`unexpected resolve ${key}`)
        },
      } as never,
    }
  }
  const medusaOrder = {
    id: "order_42",
    display_id: 42,
    email: "vevo@example.test",
    total: 14000,
    items: [{ title: "Hanna HI780-25", quantity: 1, total: 10500 }],
    shipping_methods: [{ name: "GLS házhozszállítás", total: 3500 }],
    payment_collections: [],
  }

  const env = process.env
  beforeEach(() => {
    process.env = { ...env, ...ON }
  })
  afterEach(() => {
    process.env = env
  })

  it("a failed send answers failed and does not throw: the status change stands", async () => {
    const notification = {
      createNotifications: jest.fn(async () => {
        throw new Error("provider down")
      }),
      listNotifications: jest.fn(async () => []),
    }
    const { scope, errors } = container(notification, medusaOrder)
    await expect(
      notifyStatusChange(scope, { orderId: "order_42", status: "confirmed", historyId: "h1" })
    ).resolves.toEqual({ sent: false, reason: "failed" })
    expect(errors.join()).toContain("provider down")
  })

  it("with the OS rendering and the OS down, the mail waits in the outbox: queued, not failed", async () => {
    process.env = {
      ...process.env,
      ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
      ACROPORA_OS_MAIL_RENDER_URL: "https://os.example.test/integrations/webshop-mail/render",
      ACROPORA_OS_MAIL_TOKEN: "proba-token-nem-valodi",
    }
    const fetch = jest
      .spyOn(global, "fetch")
      .mockImplementation(async () => ({ status: 503, json: async () => ({ message: "Karbantartás" }) }) as Response)
    const notification = { createNotifications: jest.fn(async () => [{}]), listNotifications: jest.fn(async () => []) }
    const rows: Array<Record<string, unknown>> = []
    const outbox = {
      listWebshopMailOutboxes: async () => [],
      createWebshopMailOutboxes: async (row: Record<string, unknown>) => (rows.push({ id: "wmout_1", ...row }), rows[0]),
      updateWebshopMailOutboxes: async (changes: Record<string, unknown>) => Object.assign(rows[0], changes),
    }
    const { scope } = container(notification, medusaOrder)
    const resolve = (scope as { resolve: (key: string) => unknown }).resolve
    const withOutbox = { resolve: (key: string) => (key === "webshop_mail_outbox" ? outbox : resolve(key)) } as never
    try {
      expect(await notifyStatusChange(withOutbox, { orderId: "order_42", status: "confirmed", historyId: "h1" })).toEqual({
        sent: false,
        reason: "queued",
      })
    } finally {
      fetch.mockRestore()
    }
    expect(notification.createNotifications).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({ template: "order-status-confirmed", failure_kind: "transient" })
  })

  it("sends with the row's trigger, on the order", async () => {
    const notification = { createNotifications: jest.fn(async () => [{}]), listNotifications: jest.fn(async () => []) }
    const { scope } = container(notification, medusaOrder)
    expect(await notifyStatusChange(scope, { orderId: "order_42", status: "ready_for_pickup", historyId: "h5" })).toEqual({ sent: true })
    expect(notification.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "order-status-ready_for_pickup",
        trigger_type: "order-status:h5",
        resource_id: "order_42",
        resource_type: "order",
        idempotency_key: "order-status:order_42:h5",
      })
    )
  })
})

describe("the admin bodies", () => {
  it("notify_customer is an optional boolean on the transition body", () => {
    expect(AdminTransitionOrderBusinessStatus.parse({ status: "confirmed" })).toEqual({ status: "confirmed" })
    expect(AdminTransitionOrderBusinessStatus.parse({ status: "closed", notify_customer: false })).toEqual({
      status: "closed",
      notify_customer: false,
    })
    expect(AdminTransitionOrderBusinessStatus.safeParse({ status: "closed", notify_customer: "false" }).success).toBe(false)
  })

  it("the resend body: an optional history row, nothing else", () => {
    expect(AdminResendOrderStatusNotification.safeParse({}).success).toBe(true)
    expect(AdminResendOrderStatusNotification.safeParse({ history_id: "h1" }).success).toBe(true)
    expect(AdminResendOrderStatusNotification.safeParse({ history_id: "" }).success).toBe(false)
    expect(AdminResendOrderStatusNotification.safeParse({ status: "closed" }).success).toBe(false)
  })

  it("the resend route validates its body", () => {
    const route = (middlewares.routes ?? []).find(
      (r) => r.matcher === "/admin/order-business-status/:order_id/resend-notification"
    )
    expect(route?.methods).toEqual(["POST"])
    expect(route?.middlewares?.length).toBe(1)
  })
})
