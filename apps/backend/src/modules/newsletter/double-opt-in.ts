import { createHash, randomBytes } from "crypto"

/**
 * THE DOUBLE OPT-IN'S RULES (card d707cf5f, items 2 and 3), without Medusa, so the
 * service and its spec share them.
 */
export const NEWSLETTER_STATUSES = ["pending", "confirmed", "unsubscribed"] as const
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number]

/**
 * HOW LONG A CONFIRMATION LINK WORKS: seven days. A PROPOSAL, on Balázs's list with
 * the mail's text (acrobot 44952); until he decides, the mail goes only behind its
 * switch, on the test shop.
 */
export const NEWSLETTER_CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** A link's token: 32 random bytes, base64url (43 characters). */
export const newNewsletterToken = (): string => randomBytes(32).toString("base64url")

/** The token's shape as a request may carry it; anything else is not looked up. */
export const NEWSLETTER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** What the row keeps of a confirmation token: its SHA-256, hex. */
export const newsletterTokenHash = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex")

/** Whether a confirmation sent at `sentAt` still works at `now`. A row without the time has no working link. */
export const confirmationLinkLive = (sentAt: Date | string | null | undefined, now: Date): boolean =>
  !!sentAt && now.getTime() - new Date(sentAt).getTime() <= NEWSLETTER_CONFIRM_TTL_MS
