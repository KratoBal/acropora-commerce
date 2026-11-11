import {
  ATTEMPT_LIMITS,
  adminSignInAttempts,
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

const call = async (mw: (...a: never[]) => unknown, req: Record<string, unknown>) => {
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
  await (mw as (req: unknown, res: unknown, next: unknown) => unknown)(req, res, next)
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

  it("allows ten tries per address and refuses the eleventh with 429", async () => {
    const mw = limitAttempts({
      perKey: createRateLimiter(ATTEMPT_LIMITS.signInPerAddress),
      keyOf: (req) => addressKeyOf(req.body),
    })
    for (let i = 0; i < ATTEMPT_LIMITS.signInPerAddress.max; i++) {
      expect((await call(mw, body("a@b.hu"))).next).toHaveBeenCalledTimes(1)
    }
    const refused = await call(mw, body("a@b.hu"))
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(refused.next).not.toHaveBeenCalled()
  })

  it("counts per address: another address is not affected", async () => {
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 2, windowMs: 60_000 }),
      keyOf: (req) => addressKeyOf(req.body),
    })
    await call(mw, body("a@b.hu"))
    await call(mw, body("a@b.hu"))
    expect((await call(mw, body("a@b.hu"))).res.statusCode).toBe(429)
    expect((await call(mw, body("c@d.hu"))).next).toHaveBeenCalledTimes(1)
  })

  it("the address is trimmed and lower-cased, so case and spaces are not a fresh allowance", async () => {
    expect(addressKeyOf({ email: "  A@B.hu " })).toBe("a@b.hu")
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 1, windowMs: 60_000 }),
      keyOf: (req) => addressKeyOf(req.body),
    })
    await call(mw, body("a@b.hu"))
    expect((await call(mw, body(" A@B.HU"))).res.statusCode).toBe(429)
  })

  it("no address, or an absurdly long one, is left to the route's own validation", async () => {
    for (const request of [{ body: {} }, { body: undefined }, { body: { email: 5 } }, { body: { email: "x".repeat(300) } }]) {
      expect(addressKeyOf((request as { body: unknown }).body)).toBeNull()
      const { next } = await call(signInAttempts, request)
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it("the all-addresses ceiling NEVER refuses: past it, another address still gets through and one warning line is written", async () => {
    const warn = jest.fn()
    const scope = { resolve: () => ({ warn }) }
    const perKey = createRateLimiter({ max: 5, windowMs: 60_000 })
    const mw = limitAttempts({
      perKey,
      overallWarn: { limiter: createRateLimiter({ max: 2, windowMs: 60_000 }), what: "proba-plafon" },
      keyOf: (req) => addressKeyOf(req.body),
    })
    const withScope = (email: string) => ({ ...body(email), scope })
    await call(mw, withScope("a@b.hu"))
    await call(mw, withScope("c@d.hu"))
    // the ceiling is crossed from the third try on: each one goes through
    for (const email of ["e@f.hu", "g@h.hu", "i@j.hu", "k@l.hu"]) {
      const { res, next } = await call(mw, withScope(email))
      expect(res.statusCode).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    }
    // one warning for the window, not one per try
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("proba-plafon")
  })

  it("the per-address limit still holds above the ceiling", async () => {
    const mw = limitAttempts({
      perKey: createRateLimiter({ max: 1, windowMs: 60_000 }),
      overallWarn: { limiter: createRateLimiter({ max: 1, windowMs: 60_000 }), what: "x" },
      keyOf: (req) => addressKeyOf(req.body),
    })
    const scope = { resolve: () => ({ warn: jest.fn() }) }
    await call(mw, { ...body("a@b.hu"), scope })
    expect((await call(mw, { ...body("a@b.hu"), scope })).res.statusCode).toBe(429)
  })

  it("a missing logger does not stop the try", async () => {
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
    await call(mw, { ...body("a@b.hu"), scope })
    expect((await call(mw, { ...body("c@d.hu"), scope })).next).toHaveBeenCalledTimes(1)
  })
})

describe("the other limits", () => {
  it("a discount code is counted per cart, ten in ten minutes", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.promotionsPerCart.max; i++) {
      expect((await call(promotionAttempts, { params: { id: "cart_limit" }, body: {} })).next).toHaveBeenCalledTimes(1)
    }
    expect((await call(promotionAttempts, { params: { id: "cart_limit" }, body: {} })).res.statusCode).toBe(429)
    expect((await call(promotionAttempts, { params: { id: "cart_masik" }, body: {} })).next).toHaveBeenCalledTimes(1)
  })

  it("the password change is counted per account, five in fifteen minutes", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.passwordChangePerAccount.max; i++) {
      expect(await passwordChangeAttempts.allow("authid_limit")).toBe(true)
    }
    expect(await passwordChangeAttempts.allow("authid_limit")).toBe(false)
    expect(await passwordChangeAttempts.allow("authid_masik")).toBe(true)
  })
})

describe("the admin sign-in limit (card 4e13af79)", () => {
  const body = (email: string) => ({ body: { email, password: "x" } })

  it("allows five tries per address and refuses the sixth with 429, the route does not run", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.adminSignInPerAddress.max; i++) {
      expect((await call(adminSignInAttempts, body("admin-a@acropora.hu"))).next).toHaveBeenCalledTimes(1)
    }
    const refused = await call(adminSignInAttempts, body("Admin-A@acropora.hu "))
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(refused.next).not.toHaveBeenCalled()
  })

  it("is counted per address and apart from the customer sign-in, in both directions", async () => {
    // ten customer tries use up the customer allowance for the address, and none of the admin one
    for (let i = 0; i < ATTEMPT_LIMITS.signInPerAddress.max; i++) await call(signInAttempts, body("admin-b@acropora.hu"))
    expect((await call(signInAttempts, body("admin-b@acropora.hu"))).res.statusCode).toBe(429)
    expect((await call(adminSignInAttempts, body("admin-b@acropora.hu"))).next).toHaveBeenCalledTimes(1)
    // and five admin tries for another address leave the customer allowance of that address whole
    for (let i = 0; i < ATTEMPT_LIMITS.adminSignInPerAddress.max; i++) await call(adminSignInAttempts, body("admin-c@acropora.hu"))
    expect((await call(adminSignInAttempts, body("admin-c@acropora.hu"))).res.statusCode).toBe(429)
    expect((await call(signInAttempts, body("admin-c@acropora.hu"))).next).toHaveBeenCalledTimes(1)
    expect((await call(adminSignInAttempts, body("admin-d@acropora.hu"))).next).toHaveBeenCalledTimes(1)
  })

  it("is stricter than the customer's", () => {
    expect(ATTEMPT_LIMITS.adminSignInPerAddress.max).toBeLessThan(ATTEMPT_LIMITS.signInPerAddress.max)
  })
})

describe("the wiring", () => {
  it.each([
    ["/auth/user/emailpass", adminSignInAttempts],
    ["/auth/customer/emailpass", signInAttempts],
    ["/auth/customer/emailpass/register", signUpAttempts],
    ["/store/carts/:id/promotions", promotionAttempts],
  ] as const)("guards POST %s", async (matcher, guard) => {
    const route = middlewares.routes?.find(
      (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(guard)
  })
})
