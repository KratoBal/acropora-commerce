import { describe, expect, it } from "vitest"

import { ALAP_DIAK, type KezdolapTartalom } from "./tartalom"
import { tisztitottTartalom } from "./tisztitas"

/*
  A REKORD TISZTITASA A SZERVEREN. MI PIROSIT: ha a kotott kulcs szkriptes
  erteke tisztitatlanul marad; ha egy MAS kulcs (cim, felirat) tisztitva/atirva
  lesz; ha a sima szoveg valtozik; ha a hero-dia szovege kimarad; ha a
  `tisztitott` jelolo nem kerul ra, vagy rekord nelkul is rekord lesz.
*/
const rekord = (): KezdolapTartalom => ({
  texts: {
    "kezdo.szoveg":
      '<p onclick="x()">Jó <strong>szöveg</strong></p><script>alert(1)</script>',
    "kezdo.1.szoveg": "Sima szöveg, nem HTML.",
    // a tisztító ezt MEGVÁLTOZTATNÁ (onclick), tehát az érintetlenség mérhető
    "kezdo.cim": '<p onclick="x()">Ez NEM kötött hely</p>',
  },
  slides: [
    {
      ...ALAP_DIAK[0]!,
      text: '<p>Dia <em>szöveg</em></p><img src="https://x.hu/a.png">',
    },
  ],
})

describe("a rekord tisztítása", () => {
  it("a kötött kulcsok HTML-je tisztul, a többi érintetlen, a jelölő rákerül", () => {
    const ki = tisztitottTartalom(rekord())!
    expect(ki.tisztitott).toBe(true)
    expect(ki.texts["kezdo.szoveg"]).toBe("<p>Jó <strong>szöveg</strong></p>")
    expect(ki.texts["kezdo.1.szoveg"]).toBe("Sima szöveg, nem HTML.")
    expect(ki.texts["kezdo.cim"]).toBe(
      '<p onclick="x()">Ez NEM kötött hely</p>',
    )
  })

  it("a hero-dia szövege is tisztul", () => {
    const ki = tisztitottTartalom(rekord())!
    expect(ki.slides![0]!.text).toBe("<p>Dia <em>szöveg</em></p>")
  })

  it("nincs rekord: nincs rekord; nincs dia: marad a null", () => {
    expect(tisztitottTartalom(null)).toBeNull()
    expect(tisztitottTartalom({ texts: {}, slides: null })!.slides).toBeNull()
  })

  it("nem írja át a bemenetet", () => {
    const be = rekord()
    tisztitottTartalom(be)
    expect(be.tisztitott).toBeUndefined()
    expect(be.texts["kezdo.szoveg"]).toContain("<script>")
  })
})
