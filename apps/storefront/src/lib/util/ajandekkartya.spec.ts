import { describe, expect, it } from "vitest"

import {
  ajandekkartyaJovairas,
  ajandekkartyaUzenet,
  ajandekkartyavalFizetve,
  KARTYA_MOST_NEM_ELLENORIZHETO,
  KARTYA_NEM_HASZNALHATO,
} from "./ajandekkartya"

/**
 * AZ AJÁNDÉKKÁRTYA A KOSÁRBAN (495c0007).
 *
 * MI PIROSÍT: egy másik jóváírás ajándékkártyának látszik; a kártya „mindent fizet”, holott maradt fizetendő; egy
 * hálózati hibára azt mondjuk, hogy rossz a kód; a 409-es webshop-mondat elvész.
 */
const kartya = {
  amount: 6000,
  reference: "gift_card",
  metadata: { code_last4: "H4BW" },
}

describe("ajandekkartyaJovairas", () => {
  it("a gift_card sort olvassa, mást nem", () => {
    expect(ajandekkartyaJovairas({ credit_lines: [kartya] })).toEqual({
      osszeg: 6000,
      utolso4: "H4BW",
    })
    expect(
      ajandekkartyaJovairas({
        credit_lines: [{ amount: 100, reference: "loyalty" }, null],
      }),
    ).toBeNull()
    expect(ajandekkartyaJovairas({})).toBeNull()
  })

  it("csak akkor fizet mindent, ha van kártya ÉS a végösszeg nulla", () => {
    expect(ajandekkartyavalFizetve({ total: 0, credit_lines: [kartya] })).toBe(
      true,
    )
    expect(
      ajandekkartyavalFizetve({ total: 6700, credit_lines: [kartya] }),
    ).toBe(false)
    expect(ajandekkartyavalFizetve({ total: 0, credit_lines: [] })).toBe(false)
  })
})

describe("ajandekkartyaUzenet", () => {
  it("400: nem használható; 409: a webshop mondata; minden más: most nem ellenőrizhető", () => {
    expect(ajandekkartyaUzenet(400)).toBe(KARTYA_NEM_HASZNALHATO)
    expect(
      ajandekkartyaUzenet(409, " A kosárban nincs fizetendő összeg. "),
    ).toBe("A kosárban nincs fizetendő összeg.")
    expect(ajandekkartyaUzenet(409)).toBe(KARTYA_MOST_NEM_ELLENORIZHETO)
    expect(ajandekkartyaUzenet(500)).toBe(KARTYA_MOST_NEM_ELLENORIZHETO)
    expect(ajandekkartyaUzenet(undefined)).toBe(KARTYA_MOST_NEM_ELLENORIZHETO)
  })
})
