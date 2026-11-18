/**
 * THE ONLY DOOR TO STRIPE FOR THE SETTLEMENT FEED, AND IT OPENS ONE WAY (acrobot 56393, 2026-11-18 21:37).
 *
 * The OS gets no Stripe key of its own (A9, card 6339b04c): the commerce backend reads Stripe with the key it already
 * has, and the OS reads the backend. Condition set by acrobot: this feed may reach Stripe's READ calls only,
 * `balance_transactions`, `payouts` and `payment_intents` retrieve, and there must be no path to a write.
 *
 * Two things make that true here, and the unit test asserts both:
 * - the reader has no `method` parameter: every request it sends is a GET;
 * - the path is checked against an allowlist BEFORE anything is sent, so `charges`, `refunds`,
 *   `payment_intents/<id>/capture`, `payouts/<id>/cancel` and the rest never leave the process.
 *
 * The key is in the `authorization` header only: not in the URL, not in an error text.
 */
export const STRIPE_READ_PATHS: readonly RegExp[] = [
  /^balance_transactions$/,
  /^payouts$/,
  /^payment_intents\/pi_[A-Za-z0-9]+$/,
]

export class StripeReadRefusedError extends Error {
  constructor(path: string) {
    super(`stripe path not allowed on the read-only feed: ${path}`)
    this.name = "StripeReadRefusedError"
  }
}

type QueryValue = string | number | boolean | undefined | QueryValue[] | { [key: string]: QueryValue }
export type StripeQuery = { [key: string]: QueryValue }

/** Stripe's own query encoding: `expand[]=a`, `created[gte]=1`. */
export const stripeQueryString = (query: StripeQuery | undefined): string => {
  const pairs: string[] = []
  const add = (name: string, value: QueryValue) => {
    if (value === undefined) return
    if (Array.isArray(value)) {
      for (const item of value) add(`${name}[]`, item)
      return
    }
    if (typeof value === "object") {
      for (const [inner, innerValue] of Object.entries(value)) add(`${name}[${inner}]`, innerValue)
      return
    }
    pairs.push(`${name}=${encodeURIComponent(String(value))}`)
  }
  for (const [name, value] of Object.entries(query ?? {})) add(name, value)
  return pairs.join("&")
}

export type StripeResponse = { status: number; body: any }
export type StripeReader = (path: string, query?: StripeQuery) => Promise<StripeResponse>

export const createStripeReader =
  (key: string, fetchImpl: typeof fetch = fetch): StripeReader =>
  async (path, query) => {
    if (!STRIPE_READ_PATHS.some((allowed) => allowed.test(path))) throw new StripeReadRefusedError(path)
    const qs = stripeQueryString(query)
    const response = await fetchImpl(`https://api.stripe.com/v1/${path}${qs ? `?${qs}` : ""}`, {
      method: "GET",
      headers: { authorization: `Bearer ${key}` },
    })
    const text = await response.text()
    let body: any = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    return { status: response.status, body }
  }
