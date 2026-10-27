import {
  MIN_SECRET_LENGTH,
  verifyAuthSecrets,
} from "../verify-auth-secrets"

const GOOD_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90"
const GOOD_B = "0f9e8d7c6b5a49382716f5e4d3c2b1a0"

/**
 * MI PIROSIT: ha a sablon `supersecret` erteke atmenne; ha hianyzo vagy ures
 * titok atmenne; ha a 32 karakternel rovidebb atmenne; ha az uzenet kiirna a
 * titkot; ha egy jo par visszautasitodna.
 */
describe("verifyAuthSecrets", () => {
  it("accepts two long, real values", () => {
    expect(
      verifyAuthSecrets({ JWT_SECRET: GOOD_A, COOKIE_SECRET: GOOD_B })
    ).toEqual({ ok: true })
  })

  it("accepts 32 characters and refuses 31, pinned as literals", () => {
    // literals, not the constant: a test computed from MIN_SECRET_LENGTH moves
    // with a weakened rule and proves nothing (calibration: min set to 8 stayed green)
    expect(MIN_SECRET_LENGTH).toBe(32)
    expect(GOOD_A).toHaveLength(32)
    expect(verifyAuthSecrets({ JWT_SECRET: GOOD_A, COOKIE_SECRET: GOOD_B }).ok).toBe(true)
    const short = GOOD_A.slice(1)
    expect(short).toHaveLength(31)
    expect(verifyAuthSecrets({ JWT_SECRET: short, COOKIE_SECRET: GOOD_B }).ok).toBe(false)
    expect(verifyAuthSecrets({ JWT_SECRET: GOOD_A, COOKIE_SECRET: short }).ok).toBe(false)
  })

  it("does not require the two secrets to differ (the message must not promise that rule)", () => {
    // the audit asked for presence, length and no placeholder; a rule on
    // difference would refuse an environment that reuses one value
    expect(verifyAuthSecrets({ JWT_SECRET: GOOD_A, COOKIE_SECRET: GOOD_A }).ok).toBe(true)
    const bad = verifyAuthSecrets({ JWT_SECRET: "x", COOKIE_SECRET: GOOD_B })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.message).not.toMatch(/különbözz/)
  })

  it("refuses the template value, in any letter case", () => {
    for (const value of ["supersecret", "SuperSecret", "  supersecret  "]) {
      const result = verifyAuthSecrets({ JWT_SECRET: value, COOKIE_SECRET: GOOD_B })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.problems).toEqual([{ variable: "JWT_SECRET", problem: "placeholder" }])
    }
  })

  it("refuses a missing or blank variable, and names the variable", () => {
    const result = verifyAuthSecrets({ JWT_SECRET: GOOD_A, COOKIE_SECRET: "   " })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.problems).toEqual([{ variable: "COOKIE_SECRET", problem: "missing" }])
      expect(result.message).toContain("COOKIE_SECRET")
    }
    expect(verifyAuthSecrets({}).ok).toBe(false)
  })

  it("reports every bad variable at once, not only the first", () => {
    const result = verifyAuthSecrets({ JWT_SECRET: "short", COOKIE_SECRET: "supersecret" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.map((p) => p.variable)).toEqual(["JWT_SECRET", "COOKIE_SECRET"])
  })

  it("never prints a secret value in the message", () => {
    const secret = "tooShortButReal-ZZ9"
    const result = verifyAuthSecrets({ JWT_SECRET: secret, COOKIE_SECRET: "supersecret" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).not.toContain(secret)
      expect(result.message).not.toContain("supersecret")
    }
  })
})
