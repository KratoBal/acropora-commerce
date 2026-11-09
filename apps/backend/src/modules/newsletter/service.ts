import { MedusaService } from "@medusajs/framework/utils"

import {
  type NewsletterStatus,
  confirmationCoolingDown,
  confirmationLinkLive,
  newNewsletterToken,
  newsletterTokenHash,
} from "./double-opt-in"
import NewsletterSubscriber from "./models/newsletter-subscriber"

export type NewsletterSignUp = {
  /** Already trimmed and lowercased by the route's validator. */
  email: string
  name: string
  consent_text: string
  consent_version: string
  /** The form's language: `hu` or `en`. */
  consent_language: string
  consented_at: Date
  source: string
}

/**
 * What a sign-up leads to. `confirm`: the confirmation mail goes out with these
 * tokens (they exist only here and in the mail). `none`: the address is already
 * confirmed, or pending with a confirmation mailed inside the cooldown; nothing
 * changes and nothing is sent. The route answers the same either way, so the
 * answer does not tell whether an address is on the list.
 */
export type NewsletterSignUpResult =
  | {
      action: "confirm"
      id: string
      name: string
      language: string
      confirmation_token: string
      unsubscribe_token: string
    }
  | { action: "none" }

export type NewsletterTokenResult =
  | { result: "confirmed" | "unsubscribed" }
  | { result: "invalid" | "expired" }

type SubscriberRow = {
  id: string
  status: NewsletterStatus
  confirmation_sent_at: Date | string | null
  unsubscribe_token: string | null
}

class NewsletterModuleService extends MedusaService({ NewsletterSubscriber }) {
  /**
   * THE SIGN-UP, by address (double opt-in, card d707cf5f). A new address, or one
   * that is pending or left: the row takes the name and the consent given now,
   * turns (or stays) `pending`, and gets a NEW confirmation token, so only the
   * latest mail's link works. A confirmed address is left as it is: a sign-up
   * nobody confirmed must not rewrite a confirmed row's name or consent. A pending
   * address mailed less than thirty minutes ago is left as it is too
   * (`NEWSLETTER_CONFIRM_COOLDOWN_MS`): its link still works, and no stranger can
   * turn sign-ups into a stream of mails to it.
   *
   * The unique index on `email` is the real guard; two sign-ups racing on the same
   * new address end in one row and one constraint error, which the route answers
   * like any other failure.
   */
  async signUpByEmail(input: NewsletterSignUp, now: Date = new Date()): Promise<NewsletterSignUpResult> {
    const [existing] = (await this.listNewsletterSubscribers(
      { email: input.email },
      { take: 1 }
    )) as unknown as SubscriberRow[]
    if (existing?.status === "confirmed") return { action: "none" }
    if (existing?.status === "pending" && confirmationCoolingDown(existing.confirmation_sent_at, now))
      return { action: "none" }

    const confirmationToken = newNewsletterToken()
    const unsubscribeToken = existing?.unsubscribe_token ?? newNewsletterToken()
    const changes = {
      ...input,
      status: "pending" as const,
      confirmation_token_hash: newsletterTokenHash(confirmationToken),
      confirmation_sent_at: now,
      unsubscribe_token: unsubscribeToken,
    }
    const [row] = existing
      ? await this.updateNewsletterSubscribers([{ id: existing.id, ...changes }])
      : await this.createNewsletterSubscribers([changes])
    return {
      action: "confirm",
      id: row!.id,
      name: input.name,
      language: input.consent_language,
      confirmation_token: confirmationToken,
      unsubscribe_token: unsubscribeToken,
    }
  }

  /**
   * THE CONFIRMATION LINK. It works once, within its time, and only for a pending
   * row: using it clears the token, and so does leaving, so an old link cannot put
   * back an address that left. An unknown token and a used one are the same
   * `invalid` (nothing tells which addresses exist).
   */
  async confirmByToken(token: string, now: Date = new Date()): Promise<NewsletterTokenResult> {
    const [row] = (await this.listNewsletterSubscribers(
      { confirmation_token_hash: newsletterTokenHash(token) },
      { take: 1 }
    )) as unknown as SubscriberRow[]
    if (!row || row.status !== "pending") return { result: "invalid" }
    if (!confirmationLinkLive(row.confirmation_sent_at, now)) return { result: "expired" }
    await this.updateNewsletterSubscribers([
      { id: row.id, status: "confirmed", confirmed_at: now, confirmation_token_hash: null },
    ])
    return { result: "confirmed" }
  }

  /**
   * THE LEAVING LINK: as easy as the sign-up, no sign-in, no expiry. Leaving twice
   * answers the same; the first time is the one recorded.
   */
  async unsubscribeByToken(token: string, now: Date = new Date()): Promise<NewsletterTokenResult> {
    const [row] = (await this.listNewsletterSubscribers(
      { unsubscribe_token: token },
      { take: 1 }
    )) as unknown as SubscriberRow[]
    if (!row) return { result: "invalid" }
    if (row.status !== "unsubscribed")
      await this.updateNewsletterSubscribers([
        { id: row.id, status: "unsubscribed", unsubscribed_at: now, confirmation_token_hash: null },
      ])
    return { result: "unsubscribed" }
  }
}

export default NewsletterModuleService
