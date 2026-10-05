import { describe, expect, it } from "vitest"

import { SAJAT_HIVATKOZASOK } from "@modules/layout/templates/footer/hivatkozasok"

import {
  ADATKEZELES_CIM,
  ASZF_CIM,
  ASZF_VERZIO,
  aszfElfogadas,
  regisztracioHiba,
} from "./aszf"

/**
 * AZ ASZF-ELFOGADAS REKORDJA. MI PIROSIT: ha az idopont nem ISO; ha a verzio
 * vagy a dokumentum cime hianyzik; ha a cim nem a lablec egyetlen listajabol
 * jon (akkor elesiteskor az egyik helyen atirodna, a masikon nem).
 */
describe("az ÁSZF-elfogadás rekordja", () => {
  it("időbélyeg, a Fogyasztóbarát-verzió és a Fogyasztóbarát forrása (2026-10-05)", () => {
    expect(aszfElfogadas(new Date("2026-09-29T11:30:00.000Z"))).toEqual({
      idopont: "2026-09-29T11:30:00.000Z",
      verzio: "fogyasztobarat-JPNFMVH0",
      dokumentum: "https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0",
    })
    expect(ASZF_VERZIO).not.toContain("unas")
  })

  it("a két cím a lábléc listájából jön, és a kirakat saját oldala", () => {
    const cimek = SAJAT_HIVATKOZASOK.map((h) => h.cim)
    expect(cimek).toContain(ASZF_CIM)
    expect(cimek).toContain(ADATKEZELES_CIM)
    expect([ASZF_CIM, ADATKEZELES_CIM]).toEqual([
      "/jogi/aszf",
      "/jogi/adatkezeles",
    ])
  })
})

/**
 * A REGISZTRACIO SZERVEROLDALI ELLENORZESE. MI PIROSIT: ha pipa nelkul
 * atmegy; ha kulonbozo jelszavakkal atmegy; ha egy helyes urlapot elutasit.
 */
describe("a regisztráció szerveroldali ellenőrzése", () => {
  const jo = { aszf: "on", jelszo: "titok123", jelszoUjra: "titok123" }

  it("helyes űrlapnál nincs hiba", () => {
    expect(regisztracioHiba(jo)).toBeNull()
  })

  it("pipa nélkül megáll, és megmondja, miért", () => {
    expect(regisztracioHiba({ ...jo, aszf: null })).toContain("ÁSZF")
  })

  it("két különböző jelszóval megáll", () => {
    expect(regisztracioHiba({ ...jo, jelszoUjra: "titok124" })).toBe(
      "A két jelszó nem egyezik.",
    )
  })

  it("üres jelszóval is megáll, akkor is, ha a kettő egyforma", () => {
    expect(regisztracioHiba({ ...jo, jelszo: "", jelszoUjra: "" })).toBe(
      "A két jelszó nem egyezik.",
    )
  })
})
