import middlewares from "../middlewares"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT,
  passwordLongEnough,
  requireLongPassword,
} from "../password-rules"
import { StoreChangePassword } from "../store/customers/me/password/validators"

const call = (body: unknown) => {
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
  requireLongPassword({ body } as never, res as never, next)
  return { res, next }
}

/**
 * THE PASSWORD NEEDS TEN CHARACTERS (audit P1/8). What must fail: a short
 * password accepted at sign-up, at the token reset or at the signed-in change;
 * the limit at nine or eleven; bytes counted instead of characters; a request
 * with NO password refused here instead of left to Medusa's own validation;
 * one of the three routes left without the rule.
 */
describe("the password length", () => {
  it("ten characters pass, nine do not, an accented letter is one character", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)
    expect(passwordLongEnough("123456789")).toBe(false)
    expect(passwordLongEnough("1234567890")).toBe(true)
    expect(passwordLongEnough("ááááááááá")).toBe(false)
    expect(passwordLongEnough("áááááááááá")).toBe(true)
    for (const value of [undefined, null, "", 1234567890, {}]) expect(passwordLongEnough(value)).toBe(false)
  })

  it("the sign-up and reset middleware refuses a short password with 400", () => {
    const { res, next } = call({ email: "a@b.hu", password: "rovid" })
    expect(res.statusCode).toBe(400)
    expect(res.sent).toEqual(PASSWORD_TOO_SHORT)
    expect(next).not.toHaveBeenCalled()
  })

  it("a long enough password, and a body with no password (Medusa's own validation answers it), pass", () => {
    for (const body of [{ email: "a@b.hu", password: "elegendo-hosszu" }, { email: "a@b.hu" }, undefined]) {
      const { res, next } = call(body)
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  })

  it("the signed-in change needs the length on the NEW password only", () => {
    const body = { current_password: "regi", new_password: "uj-jelszo-1" }
    expect(StoreChangePassword.safeParse(body).success).toBe(true)
    expect(StoreChangePassword.safeParse({ ...body, new_password: "rovid" }).success).toBe(false)
    expect(StoreChangePassword.safeParse({ ...body, current_password: "r" }).success).toBe(true)
  })

  it.each([
    "/auth/customer/emailpass/register",
    "/auth/customer/emailpass/update",
  ])("guards POST %s", (matcher) => {
    const route = middlewares.routes?.find(
      (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(requireLongPassword)
  })
})
