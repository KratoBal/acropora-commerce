import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
 * THE ALL-ADDRESSES CEILING ONLY WARNS, IT NEVER REFUSES (barracuda, #591
 * review). A shared refusal is a shared lockout: a script sending three hundred
 * wrong sign-ins to invented addresses would stop EVERY customer from signing
 * in for the window, and could keep it up for almost nothing. So crossing the
 * ceiling writes one warning line per window and lets the request through;
 * the per-address limit still holds, and spraying across many addresses is
 * the proxy's job (an IP-based limit at Traefik, outside this repo).
 *
 * THE CART LIMIT catches an accidental repeat, not targeted guessing: anyone
 * can open a new cart, and each new cart brings ten new tries.
 *
 * A SUCCESSFUL sign-in counts as a try too (the count is taken before the
 * route answers), so a customer signing in from many devices in quick
 * succession can reach ten. Rare; if complaints come, this is the reason.
 *
 * IN MEMORY, like the newsletter's: enough for one backend process; a second
 * instance keeps its own count, which only loosens the limit.
 */
const MINUTES = 60 * 1000

export const ATTEMPT_LIMITS = {
  /** Sign-in: ten tries per address in fifteen minutes. */
  signInPerAddress: { max: 10, windowMs: 15 * MINUTES },
  /** Sign-in across all addresses: a warning only (see above). */
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

const warned = new Map<string, number>()

/** One warning line per ceiling per ten minutes, however many tries cross it. */
const warnOncePerWindow = (req: MedusaRequest, what: string, now: number = Date.now()) => {
  const last = warned.get(what)
  if (last !== undefined && now - last < 10 * MINUTES) return
  warned.set(what, now)
  try {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(
      `Attempt ceiling crossed: ${what}. Not refused (a shared refusal would lock every customer out); the per-address limit still holds. A spray across many addresses is the proxy's to limit.`
    )
  } catch {
    // no logger: nothing to write, the request still goes through
  }
}

/** A middleware that counts a try against `keyOf(req)` and, above the limit, answers 429. */
export const limitAttempts =
  (opts: {
    perKey: RateLimiter
    /** Counts every try; crossing it logs a warning, it never refuses. */
    overallWarn?: { limiter: RateLimiter; what: string }
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
    // The all-addresses ceiling warns once per window and lets the try through
    if (opts.overallWarn && !opts.overallWarn.limiter.allow("all")) {
      warnOncePerWindow(req, opts.overallWarn.what)
    }
    if (!opts.perKey.allow(key)) {
      res.status(429).json(TOO_MANY_ATTEMPTS)
      return
    }
    next()
  }

const limiter = (limit: { max: number; windowMs: number }) => createRateLimiter(limit)

export const signInAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.signInPerAddress),
  overallWarn: { limiter: limiter(ATTEMPT_LIMITS.signInOverall), what: "sign-in across all addresses" },
  keyOf: (req) => addressKeyOf(req.body),
})

export const signUpAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.signUpPerAddress),
  overallWarn: { limiter: limiter(ATTEMPT_LIMITS.signUpOverall), what: "sign-up across all addresses" },
  keyOf: (req) => addressKeyOf(req.body),
})

export const promotionAttempts = limitAttempts({
  perKey: limiter(ATTEMPT_LIMITS.promotionsPerCart),
  keyOf: (req) => (typeof req.params?.id === "string" && req.params.id ? req.params.id : null),
})

/** The password change counts inside the route, where the account is known. */
export const passwordChangeAttempts = createRateLimiter(ATTEMPT_LIMITS.passwordChangePerAccount)
