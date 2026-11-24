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

/**
 * HOW OFTEN ONE ADDRESS CAN BE MAILED A CONFIRMATION: once per thirty minutes (barracuda, #698 review: otherwise
 * anyone could send a stranger's address hundreds of our mails a day). Inside the cooldown a sign-up for a
 * pending address answers the same, makes no new token (the mailed link keeps working) and sends nothing.
 */
export const NEWSLETTER_CONFIRM_COOLDOWN_MS = 30 * 60 * 1000

/**
 * WHAT BECAME OF THE CONFIRMATION MAIL, kept on the row (measured on the test shop 2026-11-24: a sign-up whose mail did not go
 * - the switch was off - still started the thirty minutes, so the next sign-up answered 200 and mailed nothing, and nobody could
 * see why). `sent` and `queued` (waiting in the outbox) are mails that exist; the rest are mails that were NOT sent.
 */
export const NEWSLETTER_MAIL_RESULTS = [
  "sent",
  "queued",
  "switch_off",
  "mail_off",
  "os_renderer_off",
  "no_storefront_url",
  "failed",
] as const
export type NewsletterMailResult = (typeof NEWSLETTER_MAIL_RESULTS)[number]

/** The results that mean no mail left and none is waiting. */
export const NEWSLETTER_MAIL_NOT_SENT: readonly NewsletterMailResult[] = [
  "switch_off",
  "mail_off",
  "os_renderer_off",
  "no_storefront_url",
  "failed",
]

export const newsletterMailNotSent = (result: string | null | undefined): boolean =>
  !!result && (NEWSLETTER_MAIL_NOT_SENT as readonly string[]).includes(result)

/**
 * Whether a pending row's last confirmation mail is recent enough that no new one may go at `now`. A mail that was NOT sent
 * (`result`) starts no cooldown: there is nothing to protect an address from, and the next sign-up must be able to mail. A row
 * with no recorded result (one from before the result was kept) cools down as it always did.
 */
export const confirmationCoolingDown = (
  sentAt: Date | string | null | undefined,
  now: Date,
  result?: string | null
): boolean =>
  !newsletterMailNotSent(result) && !!sentAt && now.getTime() - new Date(sentAt).getTime() < NEWSLETTER_CONFIRM_COOLDOWN_MS

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
