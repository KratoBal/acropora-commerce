import { describe, expect, it } from "vitest"

import { translator } from "@lib/i18n/dictionary"

import { adagOlvas, literOlvas } from "./adagolas"
import {
  adagSzoveg,
  gyakorisagSzoveg,
  gyartoiAdagSzoveg,
  literAllapot,
} from "./adagolas-szoveg"

/*
  AZ ADAG SZOVEGES ALAKJAI (V3.1, korall 7. pontja). MI PIROSIT: a gyarto sora angol egyseggel ("L/day") marad;
  a gyakorisag tartomanya vagy szama elveszik; a tizedes nem a lap nyelven all; egy hibas liter rossz hibat kap.
*/
const hu = translator("hu")
const en = translator("en")
const sor = (ertek: string, locale: "hu" | "en") =>
  gyartoiAdagSzoveg(adagOlvas(ertek)!, locale === "hu" ? hu : en, locale)

describe("a gyarto adagolasa olvashatoan", () => {
  it("korall tablazata szerint, magyarul es angolul", () => {
    expect(sor("5 ml/100 L/day", "hu")).toBe("5 ml / 100 liter, naponta")
    expect(sor("5 ml/100 L, 1-2/day", "hu")).toBe(
      "5 ml / 100 liter, naponta 1-2 alkalommal",
    )
    expect(sor("5 ml/100 L/week", "hu")).toBe("5 ml / 100 liter, hetente")
    expect(sor("5 ml/100 L, 3/week", "hu")).toBe(
      "5 ml / 100 liter, hetente 3 alkalommal",
    )
    expect(sor("2 drop/50 L/day", "hu")).toBe("2 csepp / 50 liter, naponta")
    expect(sor("5 ml/100 L/day", "en")).toBe("5 ml / 100 litres, daily")
    expect(sor("5 ml/100 L, 1-2/day", "en")).toBe(
      "5 ml / 100 litres, 1-2 times daily",
    )
    expect(sor("2 drop/50 L/day", "en")).toBe("2 drops / 50 litres, daily")
    expect(sor("1 drop/1 L/day", "en")).toBe("1 drop / 1 litre, daily")
  })

  /*
    A GYARTO ADAGJA, NEM KEREKITETT (barracuda, acropora-os #2527 review). MI PIROSIT: barmilyen kerekites a mennyisegen
    vagy a literen: a 0,125 "0,13" (tobb a gyartoi adagnal), a 0,004 "0" (nincs adag), a 2,555 "2,56".
  */
  it("a mennyiseget es a litert pontosan irja, ahogy a kanonikus alak tartja", () => {
    expect(sor("0.125 ml/100 L/day", "hu")).toBe(
      "0,125 ml / 100 liter, naponta",
    )
    expect(sor("0.004 ml/1 L/day", "hu")).toBe("0,004 ml / 1 liter, naponta")
    expect(sor("2.555 ml/0.375 L/week", "hu")).toBe(
      "2,555 ml / 0,375 liter, hetente",
    )
    expect(sor("0.125 ml/100 L/day", "en")).toBe("0.125 ml / 100 litres, daily")
  })

  it("a tizedes es az ezres tagolas a lap nyelven", () => {
    expect(adagSzoveg(12.5, "ml", hu, "hu")).toBe("12,5 ml")
    expect(adagSzoveg(12.5, "ml", en, "en")).toBe("12.5 ml")
    expect(adagSzoveg(1, "csepp", hu, "hu")).toBe("1 csepp")
    expect(adagSzoveg(3, "csepp", en, "en")).toBe("3 drops")
    expect(sor("500 ml/1000 L/day", "hu").replace(/\s/g, " ")).toBe(
      "500 ml / 1 000 liter, naponta",
    )
  })

  it("a hosszu gyakorisag az eredmeny-mondatba", () => {
    expect(gyakorisagSzoveg(adagOlvas("1 drop/100 L/day")!, hu)).toBe(
      "naponta egyszer",
    )
    expect(gyakorisagSzoveg(adagOlvas("1 drop/100 L, 1-2/week")!, hu)).toBe(
      "hetente 1-2 alkalommal",
    )
    expect(gyakorisagSzoveg(adagOlvas("1 drop/100 L, 3/week")!, en)).toBe(
      "3 times a week",
    )
  })
})

describe("literAllapot", () => {
  it("minden hibat a sajat neven nevez", () => {
    expect(literAllapot("  ", literOlvas)).toEqual({ hiba: "ures" })
    expect(literAllapot("abc", literOlvas)).toEqual({ hiba: "nemSzam" })
    expect(literAllapot("250 l", literOlvas)).toEqual({ hiba: "nemSzam" })
    expect(literAllapot("0", literOlvas)).toEqual({ hiba: "nemPozitiv" })
    expect(literAllapot("-5", literOlvas)).toEqual({ hiba: "nemPozitiv" })
    expect(literAllapot("200000", literOlvas)).toEqual({ hiba: "tulNagy" })
    expect(literAllapot("62,5", literOlvas)).toEqual({
      liter: 62.5,
      szokatlan: false,
    })
    expect(literAllapot("8000", literOlvas)).toEqual({
      liter: 8000,
      szokatlan: true,
    })
  })
})
