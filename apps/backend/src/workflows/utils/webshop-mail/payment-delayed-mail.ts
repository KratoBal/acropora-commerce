import { webshopMailState } from "../webshop-mail-config"
import { escapeHtml, forint, htmlDocument } from "./format"
import type { MailContent } from "./order-placed-mail"
import type { LoadedOrder, MailToSend } from "./prepare"
import { SHOP_CONTACT } from "./shipped-mail"

/**
 * "CSÚSZIK A SZÁLLÍTÁS" (brief, point 3; the lejáró zárolás plan, 2.4): the
 * card hold is released, and the customer is told three things: the delivery
 * is late, the card was NOT charged and its hold is released, and a payment
 * link comes when the order is ready.
 *
 * WHAT IT DOES NOT PROMISE: a day (the goods have not arrived, nobody knows
 * when), or when the bank shows the release (that is the bank's).
 *
 * A mixed cart's mail goes once, from its shipped order, and names the pickup
 * order too: their hold was one, and the release covers both.
 */
export const PAYMENT_DELAYED_TEMPLATE = "order-payment-delayed" as const

export const paymentDelayedKey = (orderId: string, releasedAt: string) =>
  `${PAYMENT_DELAYED_TEMPLATE}:${orderId}:${releasedAt}`

export type PaymentDelayedInput = {
  orderId: string
  /** The release this mail is about (`releaseHold`): one mail per release. */
  releasedAt: string
  /** The released hold, forint: both orders' parts of a mixed cart. */
  amount: number
  /** A mixed cart's pickup order, released with it. */
  pickupDisplayId: number | null
}

export const renderPaymentDelayedMail = (
  order: LoadedOrder,
  input: Pick<PaymentDelayedInput, "amount" | "pickupDisplayId">
): MailContent => {
  const id = `#${order.display_id}`
  const orders = input.pickupDisplayId === null ? id : `${id} és #${input.pickupDisplayId}`
  const lead = [
    "A rendelésed szállítása a vártnál később lesz lehetséges, mert nem minden tétel érkezett még meg hozzánk.",
    `A kártyádat NEM terheltük meg. A rendeléskor zárolt ${forint(input.amount)} zárolását feloldottuk; hogy ez mikor látszik a számládon, az a bankodon múlik.`,
    "Amint a rendelésed készen áll, emailben küldünk egy fizetési linket. A csomagot a fizetés után indítjuk.",
    ...(input.pickupDisplayId === null
      ? []
      : [
          `A bolti átvételes #${input.pickupDisplayId} rendelésed ugyanazzal a kártyás fizetéssel készült, ezért a zárolását is feloldottuk. A fizetési link mindkét rendelést fizeti.`,
        ]),
  ]
  const lines = [
    ...order.items.map((item) => `${item.title} × ${item.quantity}: ${forint(item.total)}`),
    ...order.shipping.map((method) => `Szállítás: ${method.name}, ${forint(method.amount)}`),
    `Végösszeg: ${forint(order.total)}`,
  ]

  const eyebrow = "SZÁLLÍTÁSI CSÚSZÁS"
  const title = "Csúszik a rendelésed szállítása"
  const text = [
    eyebrow,
    `${title}\nRendelés: ${orders}`,
    lead.join("\n\n"),
    [`A rendelésed (${id}):`, ...lines.map((line) => `- ${line}`)].join("\n"),
    `Kérdésed van? Írj nekünk: ${SHOP_CONTACT}`,
  ].join("\n\n")

  const html = htmlDocument(
    [
      `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(eyebrow)}</p>`,
      `<h1 style="font-size:26px;margin:8px 0 4px;">${escapeHtml(title)}</h1>`,
      `<p style="margin:0;color:#6b7280;">Rendelés: ${escapeHtml(orders)}</p>`,
      ...lead.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<h2 style="font-size:16px;margin:20px 0 8px;">A rendelésed (${escapeHtml(id)})</h2>`,
      `<ul style="padding-left:18px;margin:0;">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      `<p style="margin-top:24px;color:#6b7280;font-size:12px;">Kérdésed van? Írj nekünk: ${escapeHtml(SHOP_CONTACT)}</p>`,
    ].join("\n")
  )

  return { subject: `Csúszik a rendelésed szállítása (${id})`, text, html }
}

export type PaymentDelayedDeps = {
  loadOrder(orderId: string): Promise<LoadedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
}

export type PaymentDelayedSkip = "mail_off" | "no_email" | "already_sent" | "order_missing"

export type PaymentDelayedResult =
  | { status: "skip"; reason: PaymentDelayedSkip }
  | { status: "send"; mail: MailToSend }

/** The mail of one release; idempotent on it, so a retried call sends nothing more. */
export const preparePaymentDelayedMail = async (
  input: PaymentDelayedInput,
  deps: PaymentDelayedDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<PaymentDelayedResult> => {
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const key = paymentDelayedKey(input.orderId, input.releasedAt)
  if (await deps.alreadySent(key)) return { status: "skip", reason: "already_sent" }

  const order = await deps.loadOrder(input.orderId)
  if (!order) return { status: "skip", reason: "order_missing" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }

  return {
    status: "send",
    mail: {
      to,
      template: PAYMENT_DELAYED_TEMPLATE,
      idempotency_key: key,
      resource_id: order.id,
      content: renderPaymentDelayedMail(order, input),
    },
  }
}
