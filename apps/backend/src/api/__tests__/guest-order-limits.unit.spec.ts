import {
  ATTEMPT_LIMITS,
  TOO_MANY_ATTEMPTS,
  guestOrderAddressAttempts,
  guestOrderNumberAttempts,
  guestProblemAddressAttempts,
  guestProblemNumberAttempts,
} from "../attempt-limits"

const call = async (mw: (...a: never[]) => unknown, body: Record<string, unknown>) => {
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
  await (mw as (req: unknown, res: unknown, next: unknown) => unknown)({ body }, res, next)
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
  it("allows the set number of tries per address, then 429", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestOrderPerAddress.max; i++)
      expect(
        (await call(guestOrderAddressAttempts, { email: "egy@example.hu", order_number: String(1000 + i) })).next,
      ).toHaveBeenCalledTimes(1)
    const refused = await call(guestOrderAddressAttempts, { email: " EGY@example.hu ", order_number: "5000" })
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(refused.next).not.toHaveBeenCalled()
    // another address is not locked
    expect(
      (await call(guestOrderAddressAttempts, { email: "ketto@example.hu", order_number: "1" })).next,
    ).toHaveBeenCalledTimes(1)
  })

  it("allows the set number of tries per order number (guessing addresses for one order), then 429; '#' and zeros are one key", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestOrderPerOrderNumber.max; i++)
      expect(
        (await call(guestOrderNumberAttempts, { email: `cim${i}@example.hu`, order_number: i % 2 ? "#2042" : "2042" })).next,
      ).toHaveBeenCalledTimes(1)
    const refused = await call(guestOrderNumberAttempts, { email: "uj@example.hu", order_number: "002042" })
    expect(refused.res.statusCode).toBe(429)
    expect(refused.next).not.toHaveBeenCalled()
    // another order is not locked
    expect((await call(guestOrderNumberAttempts, { email: "uj@example.hu", order_number: "2043" })).next).toHaveBeenCalledTimes(
      1,
    )
  })

  it("a request without a key goes through to the route's own validation (the limits do not eat it)", async () => {
    expect((await call(guestOrderAddressAttempts, { order_number: "1" })).next).toHaveBeenCalledTimes(1)
    expect((await call(guestOrderNumberAttempts, { email: "a@b.hu" })).next).toHaveBeenCalledTimes(1)
  })
})

/*
  THE PROBLEM REPORT'S OWN LIMITS (V1.2). MI PIROSIT: ha a bejelentes a keresesi keretbol fogyasztana (egy
  bejelentes: legfeljebb 5 kep + a bejelentes, tobb hivas); ha a masik cim kerete is fogyna; ha a keret nem a
  bejelentesé lenne, vagy a lookup-keret kisebb szamat kapna.
*/
describe("the problem report limits", () => {
  it("are wider than the lookup's, and counted apart from them", async () => {
    expect(ATTEMPT_LIMITS.guestProblemPerAddress.max).toBeGreaterThan(ATTEMPT_LIMITS.guestOrderPerAddress.max)
    expect(ATTEMPT_LIMITS.guestProblemPerOrderNumber.max).toBeGreaterThan(ATTEMPT_LIMITS.guestOrderPerOrderNumber.max)
    expect(guestProblemAddressAttempts).not.toBe(guestOrderAddressAttempts)
    expect(guestProblemNumberAttempts).not.toBe(guestOrderNumberAttempts)
  })

  it("let a whole filing through (five photos, the report and a retry), then refuse per address with 429", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestProblemPerAddress.max; i++)
      expect(
        (await call(guestProblemAddressAttempts, { email: "bejelent@example.hu", order_number: String(3000 + i) })).next,
      ).toHaveBeenCalledTimes(1)
    const refused = await call(guestProblemAddressAttempts, { email: "BEJELENT@example.hu", order_number: "1" })
    expect(refused.res.statusCode).toBe(429)
    expect(refused.res.sent).toEqual(TOO_MANY_ATTEMPTS)
    expect(
      (await call(guestProblemAddressAttempts, { email: "masik@example.hu", order_number: "1" })).next,
    ).toHaveBeenCalledTimes(1)
  })

  it("refuse per order number with 429, '#' and zeros being one key", async () => {
    for (let i = 0; i < ATTEMPT_LIMITS.guestProblemPerOrderNumber.max; i++)
      expect(
        (await call(guestProblemNumberAttempts, { email: `p${i}@example.hu`, order_number: i % 2 ? "#4042" : "4042" })).next,
      ).toHaveBeenCalledTimes(1)
    expect((await call(guestProblemNumberAttempts, { email: "uj@example.hu", order_number: "004042" })).res.statusCode).toBe(
      429,
    )
    expect(
      (await call(guestProblemNumberAttempts, { email: "uj@example.hu", order_number: "4043" })).next,
    ).toHaveBeenCalledTimes(1)
  })
})
