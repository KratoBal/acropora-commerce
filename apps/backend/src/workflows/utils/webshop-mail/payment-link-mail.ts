import { webshopMailState } from "../webshop-mail-config"
import { escapeHtml, forint, htmlDocument } from "./format"
import type { MailContent } from "./order-placed-mail"
import type { LoadedOrder, MailToSend } from "./prepare"
import { SHOP_CONTACT } from "./shipped-mail"

/**
 * THE PAYMENT LINK'S MAIL (brief, point 4; plan 2.4): the order is ready, here
 * is what it costs, and the "Fizetés" button. The deadline is a date: after it
 * the link no longer pays and the order is closed (L4).
 *
 * The amount is what the link charges: a mixed cart's two orders together.
 * The parcel's departure is tied to the payment, not to a day.
 */
export const PAYMENT_LINK_TEMPLATE = "order-payment-link" as const
/** Day 3 without payment (plan 2.5): the same mail, as a reminder. Once per link. */
export const PAYMENT_REMINDER_TEMPLATE = "order-payment-reminder" as const

export const paymentLinkMailKey = (orderId: string, sentAt: string, reminder = false) =>
  `${reminder ? PAYMENT_REMINDER_TEMPLATE : PAYMENT_LINK_TEMPLATE}:${orderId}:${sentAt}`

export type PaymentLinkMailInput = {
  orderId: string
  /** The link this mail is about: one mail per link sent. */
  sentAt: string
  url: string
  expiresAt: string
  amount: number
  /** A mixed cart's pickup order, paid with the same link. */
  pickup: LoadedOrder | null
  /** The day-3 reminder of the same link (L4). */
  reminder?: boolean
}

/** "2026. október 11.", the shop's own calendar day. */
export const deadlineDay = (iso: string): string =>
  new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))

const linesOf = (order: LoadedOrder) => [
  ...order.items.map((item) => `${item.title} × ${item.quantity}: ${forint(item.total)}`),
  ...order.shipping.map((method) => `Szállítás: ${method.name}, ${forint(method.amount)}`),
  `Végösszeg: ${forint(order.total)}`,
]

export const renderPaymentLinkMail = (
  order: LoadedOrder,
  input: Pick<PaymentLinkMailInput, "url" | "expiresAt" | "amount" | "pickup" | "reminder">
): MailContent => {
  const id = `#${order.display_id}`
  const pickup = input.pickup
  const orders = pickup ? `${id} és #${pickup.display_id}` : id
  const day = deadlineDay(input.expiresAt)
  const lead = [
    "A rendelésed készen áll. Most fizetheted ki a lenti gombbal; a csomagot a fizetés után indítjuk.",
    ...(pickup
      ? [`A fizetés a bolti átvételes #${pickup.display_id} rendelésedet is tartalmazza, egy összegben.`]
      : []),
    `A link ${day} végéig érvényes. Ha addig nem érkezik fizetés, a rendelést lezárjuk.`,
  ]
  const blocks = [
    { title: `A rendelésed (${id})`, lines: linesOf(order) },
    ...(pickup ? [{ title: `Bolti átvételes rendelésed (#${pickup.display_id})`, lines: linesOf(pickup) }] : []),
  ]

  const eyebrow = input.reminder ? "EMLÉKEZTETŐ" : "FIZETÉS"
  const title = input.reminder ? "Még kifizetheted a rendelésedet" : "Kifizetheted a rendelésedet"
  const text = [
    eyebrow,
    `${title}\nRendelés: ${orders}`,
    lead.join("\n\n"),
    `FIZETENDŐ: ${forint(input.amount)}`,
    `Fizetés: ${input.url}`,
    ...blocks.map((block) => [`${block.title}:`, ...block.lines.map((line) => `- ${line}`)].join("\n")),
    `Kérdésed van? Írj nekünk: ${SHOP_CONTACT}`,
  ].join("\n\n")

  const html = htmlDocument(
    [
      `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(eyebrow)}</p>`,
      `<h1 style="font-size:26px;margin:8px 0 4px;">${escapeHtml(title)}</h1>`,
      `<p style="margin:0;color:#6b7280;">Rendelés: ${escapeHtml(orders)}</p>`,
      ...lead.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<div style="margin-top:16px;border:1px solid #d97b2f;background:#fdf3ea;padding:14px 16px;">` +
        `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">FIZETENDŐ</p>` +
        `<p style="margin:6px 0 0;font-size:20px;font-weight:bold;">${escapeHtml(forint(input.amount))}</p></div>`,
      `<p style="margin:16px 0 0;"><a href="${escapeHtml(input.url)}" style="display:block;background:#0f1720;color:#ffffff;text-align:center;padding:12px 16px;text-decoration:none;font-weight:bold;">Fizetés</a></p>`,
      ...blocks.map(
        (block) =>
          `<h2 style="font-size:16px;margin:20px 0 8px;">${escapeHtml(block.title)}</h2>` +
          `<ul style="padding-left:18px;margin:0;">${block.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      ),
      `<p style="margin-top:24px;color:#6b7280;font-size:12px;">Kérdésed van? Írj nekünk: ${escapeHtml(SHOP_CONTACT)}</p>`,
    ].join("\n")
  )

  const subject = input.reminder
    ? `Emlékeztető: még kifizetheted a rendelésedet (${id})`
    : `Kifizetheted a rendelésedet (${id})`
  return { subject, text, html }
}

export type PaymentLinkMailDeps = {
  loadOrder(orderId: string): Promise<LoadedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
}

export type PaymentLinkMailSkip = "mail_off" | "no_email" | "already_sent" | "order_missing"

export type PaymentLinkMailResult =
  | { status: "skip"; reason: PaymentLinkMailSkip }
  | { status: "send"; mail: MailToSend }

/** The mail of one link; idempotent on it, so a retried call sends nothing more. */
export const preparePaymentLinkMail = async (
  input: PaymentLinkMailInput,
  deps: PaymentLinkMailDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<PaymentLinkMailResult> => {
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const key = paymentLinkMailKey(input.orderId, input.sentAt, input.reminder)
  if (await deps.alreadySent(key)) return { status: "skip", reason: "already_sent" }

  const order = await deps.loadOrder(input.orderId)
  if (!order) return { status: "skip", reason: "order_missing" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }

  return {
    status: "send",
    mail: {
      to,
      template: input.reminder ? PAYMENT_REMINDER_TEMPLATE : PAYMENT_LINK_TEMPLATE,
      idempotency_key: key,
      resource_id: order.id,
      content: renderPaymentLinkMail(order, input),
    },
  }
}
