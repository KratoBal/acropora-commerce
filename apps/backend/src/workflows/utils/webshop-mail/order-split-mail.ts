import { webshopMailState } from "../webshop-mail-config"
import { escapeHtml, forint, htmlDocument } from "./format"
import type { MailContent } from "./order-placed-mail"
import type { LoadedOrder, MailToSend } from "./prepare"
import { SHOP_CONTACT } from "./shipped-mail"

/**
 * "KÉT RÉSZBEN ÉRKEZIK A RENDELÉSED" (card 0a14f739, C/3; acrobot 26651): the
 * order was split because not every item has arrived. The customer is told,
 * so that two parcels and two payments are no surprise: which part comes now
 * and which later, under which order numbers, and how each is paid. A card
 * order's second part is paid through a link sent when it is ready (the link
 * mail says so then); the first part is charged only its own amount.
 *
 * WHAT IT DOES NOT PROMISE: a day for the second part (nobody knows it yet).
 */
export const ORDER_SPLIT_TEMPLATE = "order-split" as const

/** One notice per split: a retried split sends nothing more. */
export const orderSplitKey = (orderId: string, splitOrderId: string) =>
  `${ORDER_SPLIT_TEMPLATE}:${orderId}:${splitOrderId}`

/** How the two parts are paid: the original order's payment. */
export type SplitPayment = "card" | "cod" | "store"

export type OrderSplitInput = {
  /** The original order, the part that comes now. */
  orderId: string
  /** The new order, the part that comes later. */
  splitOrderId: string
  payment: SplitPayment
}

const PAYMENT_LINES: Record<SplitPayment, string[]> = {
  card: [
    "A kártyádról az első részért csak annak az összegét vonjuk le, amikor a csomag elindul; a rendeléskor zárolt összeg többi része felszabadul. Hogy ez mikor látszik a számládon, az a bankodon múlik.",
    "A második részhez, amikor készen áll a szállításra, emailben fizetési linket küldünk; azt a csomag indulása előtt fizeted ki.",
  ],
  cod: ["Mindkét részt a csomag átvételekor fizeted, utánvéttel, mindegyiknél a saját összegét. A második részért külön utánvét-díjat nem számolunk fel."],
  store: ["Mindkét részt az üzletben fizeted, az átvételkor."],
}

const linesOf = (order: LoadedOrder) => [
  ...order.items.map((item) => `${item.title} × ${item.quantity}: ${forint(item.total)}`),
  ...order.shipping.map((method) => `Szállítás: ${method.name}, ${forint(method.amount)}`),
  `Végösszeg: ${forint(order.total)}`,
]

export const renderOrderSplitMail = (order: LoadedOrder, splitOrder: LoadedOrder, payment: SplitPayment): MailContent => {
  const now = `#${order.display_id}`
  const later = `#${splitOrder.display_id}`
  const lead = [
    "Nem minden tétel érkezett még meg hozzánk, ezért a rendelésedet két részre bontottuk: amit már tudunk, azt most küldjük, a többi később érkezik.",
    `Az első rész a ${now} rendelés, ez indul előbb. A második rész új rendelésszámot kapott: ${later}. A második rész szállításáért nem fizetsz.`,
    ...PAYMENT_LINES[payment],
  ]
  const sections: Array<[string, string[]]> = [
    [`Az első rész (${now})`, linesOf(order)],
    [`A második rész (${later})`, linesOf(splitOrder)],
  ]

  const eyebrow = "KÉT RÉSZBEN ÉRKEZIK"
  const title = "Két részben érkezik a rendelésed"
  const text = [
    eyebrow,
    `${title}\nRendelések: ${now} és ${later}`,
    lead.join("\n\n"),
    ...sections.map(([heading, lines]) => [`${heading}:`, ...lines.map((line) => `- ${line}`)].join("\n")),
    `Kérdésed van? Írj nekünk: ${SHOP_CONTACT}`,
  ].join("\n\n")

  const html = htmlDocument(
    [
      `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(eyebrow)}</p>`,
      `<h1 style="font-size:26px;margin:8px 0 4px;">${escapeHtml(title)}</h1>`,
      `<p style="margin:0;color:#6b7280;">Rendelések: ${escapeHtml(`${now} és ${later}`)}</p>`,
      ...lead.map((line) => `<p>${escapeHtml(line)}</p>`),
      ...sections.flatMap(([heading, lines]) => [
        `<h2 style="font-size:16px;margin:20px 0 8px;">${escapeHtml(heading)}</h2>`,
        `<ul style="padding-left:18px;margin:0;">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      ]),
      `<p style="margin-top:24px;color:#6b7280;font-size:12px;">Kérdésed van? Írj nekünk: ${escapeHtml(SHOP_CONTACT)}</p>`,
    ].join("\n")
  )

  return { subject: `Két részben érkezik a rendelésed (${now} és ${later})`, text, html }
}

export type OrderSplitMailDeps = {
  loadOrder(orderId: string): Promise<LoadedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
}

export type OrderSplitMailSkip = "mail_off" | "no_email" | "already_sent" | "order_missing"

export type OrderSplitMailResult = { status: "skip"; reason: OrderSplitMailSkip } | { status: "send"; mail: MailToSend }

export const prepareOrderSplitMail = async (
  input: OrderSplitInput,
  deps: OrderSplitMailDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<OrderSplitMailResult> => {
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const key = orderSplitKey(input.orderId, input.splitOrderId)
  if (await deps.alreadySent(key)) return { status: "skip", reason: "already_sent" }

  const [order, splitOrder] = await Promise.all([deps.loadOrder(input.orderId), deps.loadOrder(input.splitOrderId)])
  if (!order || !splitOrder) return { status: "skip", reason: "order_missing" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }

  return {
    status: "send",
    mail: {
      to,
      template: ORDER_SPLIT_TEMPLATE,
      idempotency_key: key,
      resource_id: order.id,
      content: renderOrderSplitMail(order, splitOrder, input.payment),
      render: { template: "order-split", facts: { order, split_order: splitOrder, payment: input.payment } },
    },
  }
}
