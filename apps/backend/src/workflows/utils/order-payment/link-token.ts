import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * THE PAYMENT LINK'S TOKEN (the lejáró zárolás plan, 2.2): signed, not
 * guessable, and checkable without a lookup. HMAC-SHA256 over the payload,
 * with a server-side secret (`ACROPORA_PAYMENT_LINK_SECRET`).
 *
 * The payload names the order, the collection the link pays, the amount and
 * the deadline. A new link for the same order is a new token (its deadline
 * differs), and the order remembers only the newest (`link` in its payment
 * state), so an older link reads "superseded", not payable.
 */
export type PaymentLinkPayload = {
  /** The order (a mixed cart: its shipped order). */
  order_id: string
  /** The collection the link pays (a mixed cart: the shipped order's). */
  collection_id: string
  /** Forint, both orders together for a mixed cart. */
  amount: number
  /** The deadline, epoch milliseconds. */
  expires_at: number
}

type Compact = { o: string; c: string; a: number; e: number }

const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64url")

const mac = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest()

export const signPaymentLink = (payload: PaymentLinkPayload, secret: string): string => {
  const body = b64url(
    JSON.stringify({ o: payload.order_id, c: payload.collection_id, a: payload.amount, e: payload.expires_at } satisfies Compact)
  )
  return `${body}.${b64url(mac(body, secret))}`
}

/** The payload of a token this server signed; null for anything else (forged, cut, re-signed). */
export const verifyPaymentLink = (token: string, secret: string): PaymentLinkPayload | null => {
  const [body, signature, extra] = token.split(".")
  if (!body || !signature || extra !== undefined) return null
  const expected = mac(body, secret)
  const given = Buffer.from(signature, "base64url")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<Compact>
    if (
      typeof parsed.o !== "string" ||
      typeof parsed.c !== "string" ||
      typeof parsed.a !== "number" ||
      typeof parsed.e !== "number"
    ) {
      return null
    }
    return { order_id: parsed.o, collection_id: parsed.c, amount: parsed.a, expires_at: parsed.e }
  } catch {
    return null
  }
}
