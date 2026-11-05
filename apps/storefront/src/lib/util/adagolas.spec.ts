import { describe, expect, it } from "vitest"

import { adagOlvas, adagSzamol, literOlvas } from "./adagolas"

/**
 * AZ ADAGOLO-KALKULATOR MAGJA (V3.1). MI PIROSIT: ha az OS parseDose egy
 * valodi kanonikus kimenetet nem olvas; ha egy nem kanonikus, ember altal
 * ertelmezendo alakbol megis adag lesz; ha a szamolas nem aranyos a
 * literrel; ha a kerekites a csepp-adagot tortre vagy a fel csepp alattit
 * szamra viszi.
 *
 * A KANONIKUS MINTAK SZO SZERINT AZ OS TESZTJEIBOL (packages/jev/src/
 * product-enrichment/units.test.ts, "dose normalization"): a ket oldal
 * ugyanazt az alakot kell, hogy lassa.
 */
describe("adagOlvas", () => {
  it("az OS parseDose minden kanonikus kimenetet olvassa", () => {
    expect(adagOlvas("1 drop/100 L/day")).toEqual({
      mennyiseg: 1,
      egyseg: "csepp",
      literre: 100,
      gyakorisag: { min: 1, max: 1 },
      idoszak: "nap",
    })
    expect(adagOlvas("2 drop/100 L/week")).toMatchObject({
      mennyiseg: 2,
      idoszak: "het",
    })
    expect(adagOlvas("5 ml/100 L/week")).toMatchObject({
      mennyiseg: 5,
      egyseg: "ml",
    })
    expect(adagOlvas("500 ml/1000 L/day")).toMatchObject({
      mennyiseg: 500,
      literre: 1000,
    })
    expect(adagOlvas("1 ml/0.5 L/day")).toMatchObject({ literre: 0.5 })
    expect(adagOlvas("1 drop/100 L, 1-2/week")).toMatchObject({
      gyakorisag: { min: 1, max: 2 },
      idoszak: "het",
    })
    expect(adagOlvas("1 drop/100 L, 3/week")).toMatchObject({
      gyakorisag: { min: 3, max: 3 },
    })
  })

  it("amit ember ertelmezne, abbol nincs adag", () => {
    for (const nem of [
      "1-2 drop/100 L/day",
      "max. 1 drop/100 L/day",
      "1 drop/100 L",
      "1 drop/100 L/month",
      "1 cup/100 L/day",
      "1,5 drop/100 L/day",
      "1.5 drop/100 L/day",
      "0 drop/100 L/day",
      "1 drop/100 L, 2-1/week",
      "1 drop/100 L, 0/week",
      "1 Tropfen je 100 Liter /Tag",
      "5 ml/100 l/day",
      " 5 ml/100 L/day",
      "",
      null,
    ])
      expect(adagOlvas(nem)).toBeNull()
  })
})

describe("literOlvas", () => {
  it("pozitiv szamot fogad, tizedesvesszovel is", () => {
    expect(literOlvas("250")).toBe(250)
    expect(literOlvas(" 62,5 ")).toBe(62.5)
    expect(literOlvas("0")).toBeNull()
    expect(literOlvas("-5")).toBeNull()
    expect(literOlvas("250 l")).toBeNull()
    expect(literOlvas("1e3")).toBeNull()
    expect(literOlvas("")).toBeNull()
    expect(literOlvas("100001")).toBeNull()
  })
})

describe("adagSzamol", () => {
  it("a literrel aranyos, ml-nel egy tizedesre kerekit", () => {
    const adag = adagOlvas("5 ml/100 L/day")!
    expect(adagSzamol(adag, 250)).toMatchObject({
      adag: 12.5,
      egyseg: "ml",
      idoszak: "nap",
    })
    expect(adagSzamol(adag, 333).adag).toBe(16.7)
    expect(adagSzamol(adag, 333).pontos).toBeCloseTo(16.65)
  })

  it("cseppnel egeszre kerekit, fel csepp alatt nem ad szamot", () => {
    const adag = adagOlvas("1 drop/100 L, 1-2/week")!
    expect(adagSzamol(adag, 450)).toMatchObject({
      adag: 5,
      egyseg: "csepp",
      tulKicsi: false,
      gyakorisag: { min: 1, max: 2 },
    })
    expect(adagSzamol(adag, 40)).toMatchObject({ tulKicsi: true })
    expect(adagSzamol(adag, 60)).toMatchObject({ adag: 1, tulKicsi: false })
  })
})
