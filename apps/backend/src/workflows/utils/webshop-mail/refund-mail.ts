import { escapeHtml, forint, htmlDocument, SHOP_NAME } from "./format"
import type { MailContent } from "./order-placed-mail"

/**
 * THE CARD'S LAST FOUR DIGITS, FROM WHERE THEY ARE, NOT FROM A GUESS.
 *
 * Measured on stage, 2026-10-05 14:24 (acrobot 26288, orders #36, #37, #38):
 * - the payment SESSION's data carries `payment_method` as an object (Medusa's
 *   Stripe provider authorizes with `expand: ["payment_method"]`) in all three;
 * - the PAYMENT's data loses it on the direct admin capture (#36: our capture
 *   returns the intent unexpanded and the module overwrites `payment.data`
 *   with it, so `payment_method` is a `pm_...` string), and keeps it on the
 *   shared capture at shipment (#37, #38).
 * So the session is read first, the payment second. Nothing found: the mail
 * names no card.
 */
export const cardLast4Of = (datas: (Record<string, unknown> | null | undefined)[]): string | null => {
  for (const data of datas) {
    const method = data?.payment_method as { card?: { last4?: unknown } } | string | null | undefined
    const last4 = typeof method === "object" ? method?.card?.last4 : undefined
    if (typeof last4 === "string" && /^\d{4}$/.test(last4)) return last4
  }
  return null
}

export type RefundMailFacts = {
  display_id: number | string
  /** This refund. */
  amount: number
  /** Every refund on the payment so far, this one included. */
  refunded_total: number
  last4: string | null
}

/**
 * THE REFUND NOTICE (acrobot 26284), card payments only. Amounts in forint,
 * from Medusa's refund records, never from Stripe's refund list (a capture
 * smaller than the hold shows its released rest there as a refund; acrobot
 * 26265). No promise of a date: when the money shows depends on the bank.
 */
export const renderRefundMail = (facts: RefundMailFacts): MailContent => {
  const subject = `Visszatérítés a #${facts.display_id} rendelésedről`
  const card = facts.last4 ? ` a ${facts.last4} végű kártyádra` : " a kártyádra, amellyel fizettél"
  const lines = [
    `Visszatérítettünk ${forint(facts.amount)} összeget${card} a #${facts.display_id} rendelésedről.`,
    ...(facts.refunded_total > facts.amount
      ? [`Erről a rendelésről eddig összesen ${forint(facts.refunded_total)} visszatérítés ment.`]
      : []),
    "A jóváírás ideje a bankodtól függ.",
  ]

  return {
    subject,
    text: [...lines, SHOP_NAME].join("\n\n"),
    html: htmlDocument(lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n")),
  }
}
