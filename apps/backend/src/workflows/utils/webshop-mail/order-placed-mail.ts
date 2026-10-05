import type { PaymentRole } from "../payment-eligibility"
import { escapeHtml, forint, htmlDocument, SHOP_NAME } from "./format"

/**
 * THE ORDER CONFIRMATION (acrobot 26284), written from the orders as Medusa
 * booked them, in forint.
 *
 * A MIXED CART GETS ONE MAIL FOR ITS TWO ORDERS. The customer placed one cart
 * and paid in one step; the checkout told them it becomes two orders
 * (Balázs, 2026-09-29). One mail that names both, the shipped one first, says
 * the same thing again; two mails for one click would read like two
 * purchases. See `prepareOrderPlacedMail` for when it is sent.
 *
 * WHAT IT DOES NOT PROMISE: a tracking number (the Foxpost prompt, point 11:
 * the number exists only once the parcel is made and handed over in the OS),
 * a further mail, or a time. It says what is true when the order is placed.
 */
export type MailLine = { title: string; quantity: number; total: number }

export type MailOrder = {
  display_id: number | string
  items: MailLine[]
  shipping: { name: string; amount: number }[]
  total: number
  payment: PaymentRole | null
  /** The pickup half of a mixed cart (collected in the shop). */
  pickup: boolean
}

export type MailContent = { subject: string; text: string; html: string }

const PAYMENT_LABEL: Record<PaymentRole, string> = {
  ONLINE_CARD: "Bankkártya",
  COD: "Utánvét",
  PAY_AT_STORE: "Fizetés a boltban",
}

const paymentSentence = (role: PaymentRole | null): string | null => {
  switch (role) {
    case "ONLINE_CARD":
      // capture: false; the card is charged when the order is fulfilled
      return "A kártyádon most zároltuk az összeget; a terhelés akkor történik, amikor a rendelést teljesítjük."
    case "COD":
      return "Az összeget a csomag átvételekor fizeted."
    case "PAY_AT_STORE":
      return "Az összeget a boltban, átvételkor fizeted."
    default:
      return null
  }
}

const orderTitle = (order: MailOrder) =>
  `Rendelés #${order.display_id}${order.pickup ? " (átvétel a boltban)" : ""}`

export const renderOrderPlacedMail = (orders: MailOrder[]): MailContent => {
  if (!orders.length) throw new Error("An order confirmation needs at least one order")

  const mixed = orders.length > 1
  const ids = orders.map((order) => `#${order.display_id}`)
  const subject = mixed
    ? `Rendeléseid visszaigazolása (${ids.join(" és ")})`
    : `Rendelésed visszaigazolása (${ids[0]})`

  const intro: string[] = ["Köszönjük a rendelésedet!"]
  if (mixed) {
    intro.push(
      "Az élő állat miatt két rendelés lett belőle: a kiszállítandó tételeké, és a boltban átvehetőké."
    )
    if (orders.every((order) => order.payment === "ONLINE_CARD")) {
      intro.push("A kártyás fizetés a kettőre együtt, egy lépésben történt.")
    }
  }

  const sections = orders.map((order) => {
    const lines = [
      ...order.items.map((item) => `${item.title} × ${item.quantity}: ${forint(item.total)}`),
      ...order.shipping.map((method) => `Szállítás: ${method.name}, ${forint(method.amount)}`),
      `Fizetendő: ${forint(order.total)}`,
      ...(order.payment ? [`Fizetés: ${PAYMENT_LABEL[order.payment]}`] : []),
    ]
    const sentence = paymentSentence(order.payment)
    return { title: orderTitle(order), lines, sentence }
  })

  const outro: string[] = []
  if (mixed) {
    outro.push(`Összesen: ${forint(orders.reduce((sum, order) => sum + order.total, 0))}`)
  }
  if (orders.some((order) => !order.pickup)) {
    outro.push("Összekészítjük a rendelésedet. Követési szám csak a csomag feladása után lesz.")
  }
  if (orders.some((order) => order.pickup)) {
    outro.push("Az élő állatos rendelést a boltban veszed át.")
  }

  const text = [
    intro.join(" "),
    ...sections.map((section) =>
      [section.title, ...section.lines.map((line) => `- ${line}`), ...(section.sentence ? [section.sentence] : [])].join(
        "\n"
      )
    ),
    ...outro,
    SHOP_NAME,
  ].join("\n\n")

  const html = htmlDocument(
    [
      `<p>${intro.map(escapeHtml).join(" ")}</p>`,
      ...sections.map(
        (section) =>
          `<h2 style="font-size:16px;margin:20px 0 8px;">${escapeHtml(section.title)}</h2>` +
          `<ul style="padding-left:18px;margin:0;">${section.lines
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join("")}</ul>` +
          (section.sentence ? `<p>${escapeHtml(section.sentence)}</p>` : "")
      ),
      ...outro.map((line) => `<p>${escapeHtml(line)}</p>`),
    ].join("\n")
  )

  return { subject, text, html }
}
