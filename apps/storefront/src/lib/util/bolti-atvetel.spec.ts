import { translator } from "@lib/i18n/dictionary"
import { describe, expect, it } from "vitest"

import {
  boltiAtvetelTiltvaSzoveg,
  hianyzoTetelekValaszbol,
  letiltottAtvetelRaktara,
  mindenAtvetelLetiltott,
  type BoltiOpcio,
} from "./bolti-atvetel"

const opcio = (
  tipus: string,
  hianyzik: boolean,
  raktar?: string,
): BoltiOpcio => ({
  insufficient_inventory: hianyzik,
  service_zone: {
    fulfillment_set: { type: tipus, location: raktar ? { id: raktar } : null },
  },
})

/**
 * A LETILTOTT BOLTI ATVETEL MAGYARAZATA (V2.5 B). MI PIROSIT: ha egy hazhozszallitas hianya
 * letiltottnak latszana az atvetel mellett; ha egy elerheto atvetel mellett a mod kartyaja is
 * tiltott lenne; ha a raktar nem a letiltott opcio raktara; ha nev nelkul ures mondat jelenne meg;
 * ha egy hibas backend-valasz nevet talalna ki.
 */
describe("letiltottAtvetelRaktara / mindenAtvetelLetiltott", () => {
  it("BA-RAKTAR: az elso LETILTOTT atvetel raktara; a hazhozszallitas hianya nem szamit", () => {
    const opciok = [
      opcio("shipping", true, "sloc_haz"),
      opcio("pickup", false, "sloc_jo"),
      opcio("pickup", true, "sloc_bolt"),
    ]
    expect(letiltottAtvetelRaktara(opciok)).toBe("sloc_bolt")
    expect(
      letiltottAtvetelRaktara([opcio("pickup", false, "sloc_jo")]),
    ).toBeNull()
    expect(
      letiltottAtvetelRaktara([opcio("shipping", true, "sloc_haz")]),
    ).toBeNull()
    expect(letiltottAtvetelRaktara(null)).toBeNull()
    expect(letiltottAtvetelRaktara([opcio("pickup", true)])).toBeNull()
  })

  // barracuda, #766: ket letiltott bolt, ket raktar: a nevek egyik sor alatt sem allhatnak (a masik bolt keszleten lehet)
  it("BA-TOBB-RAKTAR: tobb kulonbozo letiltott raktar, vagy egy ismeretlen raktaru letiltott: nincs raktar (altalanos mondat)", () => {
    expect(
      letiltottAtvetelRaktara([
        opcio("pickup", true, "sloc_a"),
        opcio("pickup", true, "sloc_b"),
      ]),
    ).toBeNull()
    expect(
      letiltottAtvetelRaktara([
        opcio("pickup", true, "sloc_a"),
        opcio("pickup", true),
      ]),
    ).toBeNull()
    // ugyanaz a raktar ket opciora: egy lista igaz mindketto sorara
    expect(
      letiltottAtvetelRaktara([
        opcio("pickup", true, "sloc_a"),
        opcio("pickup", true, "sloc_a"),
      ]),
    ).toBe("sloc_a")
    // egy letiltott es egy elerheto masik bolt: a letiltotte
    expect(
      letiltottAtvetelRaktara([
        opcio("pickup", true, "sloc_a"),
        opcio("pickup", false, "sloc_b"),
      ]),
    ).toBe("sloc_a")
  })

  it("BA-MIND: a mod kartyaja csak akkor tiltott, ha MINDEN atvetel letiltott (es van atvetel)", () => {
    expect(mindenAtvetelLetiltott([opcio("pickup", true, "a")])).toBe(true)
    expect(
      mindenAtvetelLetiltott([
        opcio("pickup", true, "a"),
        opcio("pickup", false, "b"),
      ]),
    ).toBe(false)
    expect(mindenAtvetelLetiltott([opcio("shipping", true, "a")])).toBe(false)
    expect(mindenAtvetelLetiltott([])).toBe(false)
    expect(mindenAtvetelLetiltott(undefined)).toBe(false)
  })
})

describe("boltiAtvetelTiltvaSzoveg", () => {
  it("BA-NEV: a tetel neve a mondatban all, tobb nev vesszovel", () => {
    expect(boltiAtvetelTiltvaSzoveg(["Acropora austea"])).toContain(
      "Acropora austea",
    )
    const ketto = boltiAtvetelTiltvaSzoveg(["Alfa", "Beta"])
    expect(ketto).toContain("Alfa, Beta")
  })

  it("BA-ALTALANOS: nev nelkul (null, ures, csak szokoz) az altalanos mondat all, nem ures szoveg", () => {
    const altalanos = translator("hu")("checkoutShipping.pickupBlockedUnknown")
    expect(altalanos.length).toBeGreaterThan(20)
    for (const nevek of [null, undefined, [], ["  "]]) {
      expect(boltiAtvetelTiltvaSzoveg(nevek)).toBe(altalanos)
    }
  })

  it("BA-ANGOL: az angol oldalon angol mondat all", () => {
    const en = boltiAtvetelTiltvaSzoveg(["Alfa"], translator("en"))
    expect(en).toContain("Alfa")
    expect(en).toMatch(/pick/i)
  })
})

describe("hianyzoTetelekValaszbol", () => {
  it("BA-VALASZ: a cimek listaja; a rossz alak null, az ures lista ures lista", () => {
    expect(
      hianyzoTetelekValaszbol({
        lines: [{ title: "Alfa", handle: "alfa" }, { title: " Beta " }],
      }),
    ).toEqual(["Alfa", "Beta"])
    expect(hianyzoTetelekValaszbol({ lines: [] })).toEqual([])
    expect(
      hianyzoTetelekValaszbol({ lines: [{ handle: "x" }, { title: 5 }] }),
    ).toEqual([])
    for (const rossz of [null, undefined, "x", 3, {}, { lines: "x" }]) {
      expect(hianyzoTetelekValaszbol(rossz)).toBeNull()
    }
  })
})
