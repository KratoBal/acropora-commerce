import {
  ATTEMPT_LIMITS,
  TOO_MANY_ATTEMPTS,
  guestOrderAddressAttempts,
  guestOrderNumberAttempts,
} from "../attempt-limits"

const call = (mw: (...a: never[]) => unknown, body: Record<string, unknown>) => {
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
  ;(mw as (req: unknown, res: unknown, next: unknown) => void)({ body }, res, next)
  return { res, next }
}

/*
  THE GUEST ORDER LOOKUP'S LIMITS (V1.1). The e-mail address is the second factor, so BOTH ways of guessing
  are counted: many order numbers against one address, and many addresses against one order number.
  MI PIROSIT: ha az address-limit nem fogna meg a sok rendelesszamot egy cimre; ha a rendelesszam-limit nem
  fogna meg a sok cimet egy rendelesre; ha a limit a masik cimet is zarna; ha a `#`/kisbetu/szokoz uj
  keretet adna; ha a keres nelkuli kerest (kulcs nelkuli) a limit blokkolna a route validacioja helyett.
*/
describe("the guest order lookup limits", () => {
  it("allows the set number of tries per address, then 429", () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestOrderPerAddress.max; i++)
      expect(
        call(guestOrderAddressAttempts, { email: "egy@example.hu", order_number: String(1000 + i) }).next,
      ).toHaveBeenCalledTimes(1)
    const refused = call(guestOrderAddressAttempts, { email: " EGY@example.hu ", order_number: "5000" })
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(refused.next).not.toHaveBeenCalled()
    // another address is not locked
    expect(
      call(guestOrderAddressAttempts, { email: "ketto@example.hu", order_number: "1" }).next,
    ).toHaveBeenCalledTimes(1)
  })

  it("allows the set number of tries per order number (guessing addresses for one order), then 429; '#' and zeros are one key", () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestOrderPerOrderNumber.max; i++)
      expect(
        call(guestOrderNumberAttempts, { email: `cim${i}@example.hu`, order_number: i % 2 ? "#2042" : "2042" }).next,
      ).toHaveBeenCalledTimes(1)
    const refused = call(guestOrderNumberAttempts, { email: "uj@example.hu", order_number: "002042" })
    expect(refused.res.statusCode).toBe(429)
    expect(refused.next).not.toHaveBeenCalled()
    // another order is not locked
    expect(call(guestOrderNumberAttempts, { email: "uj@example.hu", order_number: "2043" }).next).toHaveBeenCalledTimes(
      1,
    )
  })

  it("a request without a key goes through to the route's own validation (the limits do not eat it)", () => {
    expect(call(guestOrderAddressAttempts, { order_number: "1" }).next).toHaveBeenCalledTimes(1)
    expect(call(guestOrderNumberAttempts, { email: "a@b.hu" }).next).toHaveBeenCalledTimes(1)
  })
})
