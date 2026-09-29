import { describe, expect, it } from "vitest"

import { SIMPLEPAY_LOGO } from "@lib/util/simplepay-nyilatkozat"
import { config } from "./middleware"

/**
 * A MIDDLEWARE ATIRANYITASA ES A STATIKUS FAJLOK.
 *
 * A middleware minden utat, amit a `matcher` lefed, orszagkodos utra iranyit.
 * Egy `public/` alatti fajl csak akkor jut el a vevohoz, ha az utja a kizart
 * ELOTAGOK egyikevel kezdodik (`images`, `assets`, ...): a `.png` vegzodes
 * nem eleg. Merve a teszt kirakaton 2026-09-29: a `/simplepay/...png` 307-tel
 * a `/hu/simplepay/...` utra ment, es ott 404 lett.
 *
 * MI PIROSIT: ha a SimplePay logo (vagy barmely itt felsorolt statikus fajl)
 * utja a middleware ala esik.
 */
const lefedi = (ut: string) =>
  config.matcher.some((minta) => new RegExp(`^${minta}$`).test(ut))

describe("a middleware és a statikus fájlok", () => {
  it("a SimplePay logó útja nem esik az átirányítás alá", () => {
    expect(lefedi(SIMPLEPAY_LOGO)).toBe(false)
  })

  it("a minta tényleg átirányít egy oldalt és egy előtag nélküli képet (a mérés kontrollja)", () => {
    expect(lefedi("/checkout")).toBe(true)
    expect(lefedi("/simplepay/simplepay-kartyak.png")).toBe(true)
  })
})
