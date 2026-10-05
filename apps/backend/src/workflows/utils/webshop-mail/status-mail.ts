import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { webshopMailState } from "../webshop-mail-config"
import type { PaymentRole } from "../payment-eligibility"
import { escapeHtml, forint, htmlDocument } from "./format"
import type { MailContent } from "./order-placed-mail"
import type { LoadedOrder, MailToSend } from "./prepare"
import { SHOP_CONTACT } from "./shipped-mail"

/**
 * THE STATUS MAILS (Rendelések prompt, point 10; the statuses Balázs marked
 * with an envelope, 2026-09-02: Feldolgozásra vár, Visszaigazolva, Kiszállítás,
 * Átvehető, Megrendelés lezárva).
 *
 * TWO OF THE FIVE ARE ALREADY OTHER MAILS, AND DO NOT GO TWICE:
 * - Feldolgozásra vár is the status an order is PLACED in, and nothing moves
 *   an order back to it. Its mail is the order confirmation (`order-placed`).
 * - Kiszállítás: when the "Feladtuk a csomagodat" mail (`order-shipped`, with
 *   the tracking number) already went for this order, the status mail is
 *   skipped (`shipped_mail_sent`); the customer gets one mail for one parcel.
 *
 * Készletezés alatt and Sikertelenül lezárt rendelés have no mail.
 *
 * WHAT THEY DO NOT PROMISE: a delivery day, opening hours, a further mail.
 * Amounts are the order's as Medusa booked them, in forint.
 */
export type StatusMailStatus = "confirmed" | "out_for_delivery" | "ready_for_pickup" | "closed"

export const STATUS_MAIL_STATUSES: readonly StatusMailStatus[] = [
  "confirmed",
  "out_for_delivery",
  "ready_for_pickup",
  "closed",
]

export const isStatusMailStatus = (status: string): status is StatusMailStatus =>
  (STATUS_MAIL_STATUSES as readonly string[]).includes(status)

export const statusMailTemplate = (status: StatusMailStatus) => `order-status-${status}` as const

/**
 * The notification's `trigger_type`: the history row the mail is about. The
 * notification DTO does not return the idempotency key, so this is how the OS
 * (through `adminStatusDetail`) finds the mail of each history row.
 */
export const statusMailTrigger = (historyId: string) => `order-status:${historyId}`

export const statusMailKey = (orderId: string, historyId: string, resendAt?: number) =>
  `order-status:${orderId}:${historyId}${resendAt === undefined ? "" : `:resend:${resendAt}`}`

const PAYMENT_LABEL: Record<PaymentRole, string> = {
  ONLINE_CARD: "Bankkártya",
  COD: "Utánvét",
  PAY_AT_STORE: "Fizetés a boltban",
}

type StatusCopy = { eyebrow: string; title: string; subject: string; lead: string[] }

const copy = (status: StatusMailStatus, order: LoadedOrder): StatusCopy => {
  const id = `#${order.display_id}`
  const method = order.shipping.map((method) => method.name).filter(Boolean)[0]
  switch (status) {
    case "confirmed":
      return {
        eyebrow: "RENDELÉS VISSZAIGAZOLVA",
        title: "Visszaigazoltuk a rendelésedet",
        subject: `Visszaigazoltuk a rendelésedet (${id})`,
        lead: ["A rendelésedet átnéztük és visszaigazoltuk. Most összekészítjük."],
      }
    case "out_for_delivery":
      return {
        eyebrow: "KISZÁLLÍTÁS",
        title: "Úton van a rendelésed",
        subject: `Úton van a rendelésed (${id})`,
        lead: [
          "A rendelésedet átadtuk a szállítónak.",
          ...(method ? [`Szállítási mód: ${method}`] : []),
        ],
      }
    case "ready_for_pickup":
      return {
        eyebrow: "ÁTVEHETŐ",
        title: "Átveheted a rendelésedet",
        subject: `Átvehető a rendelésed (${id})`,
        lead: [
          "A rendelésed elkészült, átveheted.",
          ...(method ? [`Átvétel: ${method}`] : []),
        ],
      }
    case "closed":
      return {
        eyebrow: "RENDELÉS LEZÁRVA",
        title: "Köszönjük a vásárlást!",
        subject: `Köszönjük a vásárlást (${id})`,
        lead: ["A rendelésedet lezártuk. Köszönjük, hogy nálunk vásároltál!"],
      }
  }
}

/** The amount still due on pickup: cash on delivery on the way, paying at the shop on collection. */
const dueOnPickup = (status: StatusMailStatus, order: LoadedOrder): number | null => {
  if (status === "out_for_delivery" && order.payment === "COD") return order.total
  if (status === "ready_for_pickup" && order.payment === "PAY_AT_STORE") return order.total
  return null
}

export const renderStatusMail = (status: StatusMailStatus, order: LoadedOrder): MailContent => {
  const words = copy(status, order)
  const due = dueOnPickup(status, order)
  const lines = [
    ...order.items.map((item) => `${item.title} × ${item.quantity}: ${forint(item.total)}`),
    ...order.shipping.map((method) => `Szállítás: ${method.name}, ${forint(method.amount)}`),
    `Végösszeg: ${forint(order.total)}`,
    ...(order.payment ? [`Fizetés: ${PAYMENT_LABEL[order.payment]}`] : []),
  ]

  const text = [
    words.eyebrow,
    `${words.title}\nRendelés: #${order.display_id}`,
    words.lead.join("\n"),
    ...(due !== null ? [`ÁTVÉTELKOR FIZETENDŐ: ${forint(due)}`] : []),
    ["A rendelésed:", ...lines.map((line) => `- ${line}`)].join("\n"),
    `Kérdésed van? Írj nekünk: ${SHOP_CONTACT}`,
  ].join("\n\n")

  const dueBlock =
    due !== null
      ? `<div style="margin-top:16px;border:1px solid #d97b2f;background:#fdf3ea;padding:14px 16px;">` +
        `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">ÁTVÉTELKOR FIZETENDŐ</p>` +
        `<p style="margin:6px 0 0;font-size:20px;font-weight:bold;">${escapeHtml(forint(due))}</p></div>`
      : ""

  const html = htmlDocument(
    [
      `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(words.eyebrow)}</p>`,
      `<h1 style="font-size:26px;margin:8px 0 4px;">${escapeHtml(words.title)}</h1>`,
      `<p style="margin:0;color:#6b7280;">Rendelés: #${escapeHtml(String(order.display_id))}</p>`,
      ...words.lead.map((line) => `<p>${escapeHtml(line)}</p>`),
      dueBlock,
      `<h2 style="font-size:16px;margin:20px 0 8px;">A rendelésed</h2>`,
      `<ul style="padding-left:18px;margin:0;">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      `<p style="margin-top:24px;color:#6b7280;font-size:12px;">Kérdésed van? Írj nekünk: ${escapeHtml(SHOP_CONTACT)}</p>`,
    ].join("\n")
  )

  return { subject: words.subject, text, html }
}

export type StatusMailDeps = {
  loadOrder(orderId: string): Promise<LoadedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
  /** A "Feladtuk" mail (`order-shipped`) that did not fail, for this order. */
  shippedMailSent(orderId: string): Promise<boolean>
}

export type StatusMailSkip =
  | "mail_off"
  | "no_mail_for_status"
  | "no_email"
  | "already_sent"
  | "shipped_mail_sent"
  | "order_missing"

export type StatusMailResult =
  | { status: "skip"; reason: StatusMailSkip }
  | { status: "send"; mail: MailToSend }

/**
 * The mail of ONE status change (one history row). Idempotent on the row: a
 * retried call sends nothing more. A resend (`resendAt`) is a new key on the
 * same row, so it goes again even after a success.
 */
export const prepareStatusMail = async (
  input: { orderId: string; status: OrderBusinessStatus; historyId: string; resendAt?: number },
  deps: StatusMailDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<StatusMailResult> => {
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const status = input.status
  if (!isStatusMailStatus(status)) return { status: "skip", reason: "no_mail_for_status" }

  const key = statusMailKey(input.orderId, input.historyId, input.resendAt)
  if (input.resendAt === undefined && (await deps.alreadySent(key))) {
    return { status: "skip", reason: "already_sent" }
  }
  if (status === "out_for_delivery" && input.resendAt === undefined && (await deps.shippedMailSent(input.orderId))) {
    return { status: "skip", reason: "shipped_mail_sent" }
  }

  const order = await deps.loadOrder(input.orderId)
  if (!order) return { status: "skip", reason: "order_missing" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }

  return {
    status: "send",
    mail: {
      to,
      template: statusMailTemplate(status),
      trigger: statusMailTrigger(input.historyId),
      idempotency_key: key,
      resource_id: order.id,
      content: renderStatusMail(status, order),
    },
  }
}
