import { MedusaService } from "@medusajs/framework/utils"

import {
  confirmationCoolingDown,
  confirmationLinkLive,
  newNewsletterToken,
  newsletterTokenHash,
} from "../newsletter/double-opt-in"
import StockAlertSubscription from "./models/stock-alert-subscription"
import type { StockAlertKind, StockAlertStatus } from "./subject"

export type StockAlertSignUp = {
  /** Already trimmed and lowercased by the route's validator. */
  email: string
  subject_kind: StockAlertKind
  subject_key: string
  subject_label: string
  source_product_id: string | null
  consent_text: string
  consent_version: string
  consent_language: string
  consented_at: Date
  source: string
}

/**
 * What a sign-up leads to, the newsletter's way: `confirm` sends the confirmation mail with these tokens (they exist
 * only here and in the mail); `none` (already confirmed for this subject, or pending with a mail inside the cooldown)
 * changes and sends nothing. The route answers the same either way, so the answer does not tell whether an address
 * is on a list.
 */
export type StockAlertSignUpResult =
  | {
      action: "confirm"
      id: string
      subject_label: string
      language: string
      confirmation_token: string
      unsubscribe_token: string
    }
  | { action: "none" }

export type StockAlertTokenResult = { result: "confirmed" | "unsubscribed" | "invalid" | "expired" }

type Row = {
  id: string
  subject_kind: string
  subject_key: string
  status: StockAlertStatus
  confirmation_sent_at: Date | string | null
  unsubscribe_token: string | null
  notified_at: Date | string | null
}

/**
 * THE NEWSLETTER'S DOUBLE OPT-IN (card d707cf5f), per address AND subject. The token rules (32 random bytes, only the
 * confirmation token's hash kept, seven days, thirty minutes between two mails) are the newsletter's own functions,
 * so the two lists cannot drift apart.
 */
class StockAlertModuleService extends MedusaService({ StockAlertSubscription }) {
  /**
   * THE SIGN-UP. A new address and subject, or one pending or left: the row takes the consent given now, turns (or
   * stays) `pending` and gets a NEW confirmation token, so only the latest mail's link works. A confirmed row still
   * waiting is left as it is. A confirmed row ALREADY TOLD (`notified_at`, the arrival mail is one mail) is a new
   * wait: it goes through the double opt-in again, like a left one, and starts its arrival from nothing. The unique index is the real guard against two racing sign-ups; the loser's constraint error is
   * answered like any other failure.
   *
   * THE COOLDOWN IS PER ADDRESS, NOT PER ROW (barracuda, #701 review): every subject is a new row, so a cooldown per
   * row let a stranger sign one address up for every species in the catalogue, one confirmation mail each (with the
   * route's three tries per ten minutes, 432 mails a day from our sender). If ANY row of the address had a
   * confirmation mailed in the last thirty minutes, the sign-up changes nothing: no row, no token, no mail, and the
   * same answer. The buyer signs up for the second species after the cooldown.
   */
  async signUp(input: StockAlertSignUp, now: Date = new Date()): Promise<StockAlertSignUpResult> {
    const rows = (await this.listStockAlertSubscriptions({ email: input.email })) as unknown as Row[]
    if (rows.some((row) => confirmationCoolingDown(row.confirmation_sent_at, now))) return { action: "none" }
    const existing = rows.find(
      (row) => row.subject_kind === input.subject_kind && row.subject_key === input.subject_key
    )
    if (existing?.status === "confirmed" && !existing.notified_at) return { action: "none" }

    const confirmationToken = newNewsletterToken()
    const unsubscribeToken = existing?.unsubscribe_token ?? newNewsletterToken()
    const changes = {
      ...input,
      status: "pending" as const,
      confirmation_token_hash: newsletterTokenHash(confirmationToken),
      confirmation_sent_at: now,
      unsubscribe_token: unsubscribeToken,
      // a new wait sees its subject afresh (`arrival.ts`)
      known_available: null,
      notified_at: null,
      notified_product_id: null,
    }
    const [row] = existing
      ? await this.updateStockAlertSubscriptions([{ id: existing.id, ...changes }])
      : await this.createStockAlertSubscriptions([changes])
    return {
      action: "confirm",
      id: row!.id,
      subject_label: input.subject_label,
      language: input.consent_language,
      confirmation_token: confirmationToken,
      unsubscribe_token: unsubscribeToken,
    }
  }

  /** THE CONFIRMATION LINK: once, within its seven days, only for a pending row; unknown and used are the same `invalid`. */
  async confirmByToken(token: string, now: Date = new Date()): Promise<StockAlertTokenResult> {
    const [row] = (await this.listStockAlertSubscriptions(
      { confirmation_token_hash: newsletterTokenHash(token) },
      { take: 1 }
    )) as unknown as Row[]
    if (!row || row.status !== "pending") return { result: "invalid" }
    if (!confirmationLinkLive(row.confirmation_sent_at, now)) return { result: "expired" }
    await this.updateStockAlertSubscriptions([
      { id: row.id, status: "confirmed", confirmed_at: now, confirmation_token_hash: null },
    ])
    return { result: "confirmed" }
  }

  /** THE LEAVING LINK: no sign-in, no expiry; leaving twice answers the same, the first time is the one recorded. */
  async unsubscribeByToken(token: string, now: Date = new Date()): Promise<StockAlertTokenResult> {
    const [row] = (await this.listStockAlertSubscriptions({ unsubscribe_token: token }, { take: 1 })) as unknown as Row[]
    if (!row) return { result: "invalid" }
    if (row.status !== "unsubscribed")
      await this.updateStockAlertSubscriptions([
        { id: row.id, status: "unsubscribed", unsubscribed_at: now, confirmation_token_hash: null },
      ])
    return { result: "unsubscribed" }
  }
}

export default StockAlertModuleService
