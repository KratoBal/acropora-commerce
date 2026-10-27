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

  it("the overall cap refuses across addresses, and a refused caller does not eat an address's allowance", () => {
    const perKey = createRateLimiter({ max: 5, windowMs: 60_000 })
    const mw = limitAttempts({
      perKey,
      overall: createRateLimiter({ max: 2, windowMs: 60_000 }),
      keyOf: (req) => addressKeyOf(req.body),
    })
    call(mw, body("a@b.hu"))
    call(mw, body("c@d.hu"))
    expect(call(mw, body("e@f.hu")).res.statusCode).toBe(429)
    // e@f.hu was refused by the overall cap: its own allowance is untouched
    expect(perKey.allow("e@f.hu")).toBe(true)
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
