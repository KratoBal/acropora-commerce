import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { createRateLimiter, type RateLimiter } from "./store/newsletter-subscriptions/rate-limit"

/**
 * ATTEMPT LIMITS ON THE CUSTOMER SIDE (audit P1/8, 04-biztonsag.md B8). The
 * stock `/auth/customer/emailpass*` and `/store/carts/:id/promotions` routes
 * take any number of tries: password guessing against an account, and
 * discount-code guessing against a cart.
 *
 * WHAT THE KEY IS, AND WHY NOT THE CALLER'S IP (the newsletter route's
 * lesson, helpers.ts): the storefront reaches this backend through server
 * actions, so almost every request arrives from the storefront server's
 * address, and a per-IP limit would be one limit for the whole shop. The key
 * is the thing under attack instead: the e-mail address for sign-in and
 * sign-up, the cart for a code. A direct caller guessing across many accounts
 * is held by the overall cap.
 *
 * THE PRICE OF A PER-ACCOUNT LIMIT, stated: someone who keeps sending wrong
 * tries for an address can keep that address from signing in for the window.
 * The window is short, the limit counts every try (the route's answer is not
 * known yet), and the alternative is unlimited guessing.
 *
 * IN MEMORY, like the newsletter's: enough for one backend process; a second
 * instance keeps its own count, which only loosens the limit.
 */
const MINUTES = 60 * 1000

export const ATTEMPT_LIMITS = {
  /** Sign-in: ten tries per address in fifteen minutes. */
  signInPerAddress: { max: 10, windowMs: 15 * MINUTES },
  /** Sign-in across all addresses: a direct caller spraying passwords. */
  signInOverall: { max: 300, windowMs: 10 * MINUTES },
  /** Sign-up: five per address in fifteen minutes. */
  signUpPerAddress: { max: 5, windowMs: 15 * MINUTES },
  signUpOverall: { max: 100, windowMs: 10 * MINUTES },
  /** A discount code on a cart: ten tries in ten minutes. */
  promotionsPerCart: { max: 10, windowMs: 10 * MINUTES },
  /** The password change: five tries per account in fifteen minutes. */
  passwordChangePerAccount: { max: 5, windowMs: 15 * MINUTES },
} as const

export const TOO_MANY_ATTEMPTS = {
  type: "too_many_requests",
  message: "Too many attempts, try again in a few minutes.",
} as const

/** The address a body names, as a key: trimmed, lower case, bounded. */
export const addressKeyOf = (body: unknown): string | null => {
  const email = (body as { email?: unknown } | undefined)?.email
  if (typeof email !== "string") return null
  const key = email.trim().toLowerCase()
  return key && key.length <= 254 ? key : null
}

/** A middleware that counts a try against `keyOf(req)` and, above the limit, answers 429. */
export const limitAttempts =
  (opts: {
    perKey: RateLimiter
    overall?: RateLimiter
    keyOf: (req: MedusaRequest) => string | null
  }) =>
  (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const key = opts.keyOf(req)
    // No key means no address or cart to count against: the route's own
    // validation answers that request.
    if (key === null) {
      next()
      return
    }
    // The overall cap first, so a refused caller does not use up an address's tries
    if (
      (opts.overall && !opts.overall.allow("all")) ||
      !opts.perKey.allow(key)
    ) {
      res.status(429).json(TOO_MANY_ATTEMPTS)
      return
    }
    next()
  }

const limiter = (limit: { max: number; windowMs: number }) => createRateLimiter(limit)

export const signInAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.signInPerAddress),
  overall: limiter(ATTEMPT_LIMITS.signInOverall),
  keyOf: (req) => addressKeyOf(req.body),
})

export const signUpAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.signUpPerAddress),
  overall: limiter(ATTEMPT_LIMITS.signUpOverall),
  keyOf: (req) => addressKeyOf(req.body),
})

export const promotionAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.promotionsPerCart),
  keyOf: (req) => (typeof req.params?.id === "string" && req.params.id ? req.params.id : null),
})

/** The password change counts inside the route, where the account is known. */
export const passwordChangeAttempts = createRateLimiter(ATTEMPT_LIMITS.passwordChangePerAccount)
