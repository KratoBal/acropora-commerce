import {
  ATTEMPT_LIMITS,
  TOO_MANY_ATTEMPTS,
  addressKeyOf,
  limitAttempts,
  passwordChangeAttempts,
  promotionAttempts,
  signInAttempts,
  signUpAttempts,
} from "../attempt-limits"
import middlewares from "../middlewares"
import { createRateLimiter } from "../store/newsletter-subscriptions/rate-limit"

const call = (mw: (...a: never[]) => unknown, req: Record<string, unknown>) => {
  const res = {
    statusCode: 0,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(b: unknown) {
      this.sent = b
    },
  }
  const next = jest.fn()
  ;(mw as (req: unknown, res: unknown, next: unknown) => void)(req, res, next)
  return { res, next }
}

/**
 * THE ATTEMPT LIMITS (audit P1/8). What must fail: an eleventh sign-in try for
 * one address getting through; the limit shared across addresses (one address
 * locking out another); the address case or spaces giving a fresh allowance;
 * a refused caller using up the overall cap; a request with no address
 * blocked instead of left to the route's validation; the cart limit counted
 * across carts; one of the routes left unguarded.
 */
describe("the sign-in limit", () => {
  const body = (email: string) => ({ body: { email, password: "x" } })

  it("allows ten tries per address and refuses the eleventh with 429", () => {
    const mw = limitAttempts({
      perKey: createRateLimiter(ATTEMPT_LIMITS.signInPerAddress),
      keyOf: (req) => addressKeyOf(req.body),
    })
    for (let i = 0; i < ATTEMPT_LIMITS.signInPerAddress.max; i++) {
      expect(call(mw, body("a@b.hu")).next).toHaveBeenCalledTimes(1)
    }
    const refused = call(mw, body("a@b.hu"))
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(refused.next).not.toHaveBeenCalled()
  })

  it("counts per address: another address is not affected", () => {
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 2, windowMs: 60_000 }),
      keyOf: (req) => addressKeyOf(req.body),
    })
    call(mw, body("a@b.hu"))
    call(mw, body("a@b.hu"))
    expect(call(mw, body("a@b.hu")).res.statusCode).toBe(429)
    expect(call(mw, body("c@d.hu")).next).toHaveBeenCalledTimes(1)
  })

  it("the address is trimmed and lower-cased, so case and spaces are not a fresh allowance", () => {
    expect(addressKeyOf({ email: "  A@B.hu " })).toBe("a@b.hu")
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 1, windowMs: 60_000 }),
      keyOf: (req) => addressKeyOf(req.body),
    })
    call(mw, body("a@b.hu"))
    expect(call(mw, body(" A@B.HU")).res.statusCode).toBe(429)
  })

  it("no address, or an absurdly long one, is left to the route's own validation", () => {
    for (const request of [{ body: {} }, { body: undefined }, { body: { email: 5 } }, { body: { email: "x".repeat(300) } }]) {
      expect(addressKeyOf((request as { body: unknown }).body)).toBeNull()
      const { next } = call(signInAttempts, request)
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it("the all-addresses ceiling NEVER refuses: past it, another address still gets through and one warning line is written", () => {
    const warn = jest.fn()
    const scope = { resolve: () => ({ warn }) }
    const perKey = createRateLimiter({ max: 5, windowMs: 60_000 })
    const mw = limitAttempts({
      perKey,
      overallWarn: { limiter: createRateLimiter({ max: 2, windowMs: 60_000 }), what: "proba-plafon" },
      keyOf: (req) => addressKeyOf(req.body),
    })
    const withScope = (email: string) => ({ ...body(email), scope })
    call(mw, withScope("a@b.hu"))
    call(mw, withScope("c@d.hu"))
    // the ceiling is crossed from the third try on: each one goes through
    for (const email of ["e@f.hu", "g@h.hu", "i@j.hu", "k@l.hu"]) {
      const { res, next } = call(mw, withScope(email))
      expect(res.statusCode).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    }
    // one warning for the window, not one per try
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("proba-plafon")
  })

  it("the per-address limit still holds above the ceiling", () => {
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 1, windowMs: 60_000 }),
      overallWarn: { limiter: createRateLimiter({ max: 1, windowMs: 60_000 }), what: "x" },
      keyOf: (req) => addressKeyOf(req.body),
    })
    const scope = { resolve: () => ({ warn: jest.fn() }) }
    call(mw, { ...body("a@b.hu"), scope })
    expect(call(mw, { ...body("a@b.hu"), scope }).res.statusCode).toBe(429)
  })

  it("a missing logger does not stop the try", () => {
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 5, windowMs: 60_000 }),
      overallWarn: { limiter: createRateLimiter({ max: 1, windowMs: 60_000 }), what: "nincs-naplo" },
      keyOf: (req) => addressKeyOf(req.body),
    })
    const scope = {
      resolve: () => {
        throw new Error("no logger")
      },
    }
    call(mw, { ...body("a@b.hu"), scope })
    expect(call(mw, { ...body("c@d.hu"), scope }).next).toHaveBeenCalledTimes(1)
  })
})

describe("the other limits", () => {
  it("a discount code is counted per cart, ten in ten minutes", () => {
    for (let i = 0; i < ATTEMPT_LIMITS.promotionsPerCart.max; i++) {
      expect(call(promotionAttempts, { params: { id: "cart_limit" }, body: {} }).next).toHaveBeenCalledTimes(1)
    }
    expect(call(promotionAttempts, { params: { id: "cart_limit" }, body: {} }).res.statusCode).toBe(429)
    expect(call(promotionAttempts, { params: { id: "cart_masik" }, body: {} }).next).toHaveBeenCalledTimes(1)
  })

  it("the password change is counted per account, five in fifteen minutes", () => {
    for (let i = 0; i < ATTEMPT_LIMITS.passwordChangePerAccount.max; i++) {
      expect(passwordChangeAttempts.allow("authid_limit")).toBe(true)
    }
    expect(passwordChangeAttempts.allow("authid_limit")).toBe(false)
    expect(passwordChangeAttempts.allow("authid_masik")).toBe(true)
  })
})

describe("the wiring", () => {
  it.each([
    ["/auth/customer/emailpass", signInAttempts],
    ["/auth/customer/emailpass/register", signUpAttempts],
    ["/store/carts/:id/promotions", promotionAttempts],
  ] as const)("guards POST %s", (matcher, guard) => {
    const route = middlewares.routes?.find(
      (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(guard)
  })
})
