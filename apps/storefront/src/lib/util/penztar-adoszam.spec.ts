import { describe, expect, it } from "vitest"

import {
  ADOSZAM_MEZO,
  CEGES_MEZO,
  cegesAdatok,
  cimMetadata,
} from "./penztar-adoszam"
import { torzsszamRendben } from "./szamlazas"

/** Generalt, ellenorzo szamjegyes torzsszam (valodi cegadoszam nem all a tesztben). */
const torzsszam = (() => {
  for (let n = 10000000; n < 10000100; n += 1) {
    const s = String(n)
    if (torzsszamRendben(s)) return s
  }
  throw new Error("nincs ervenyes torzsszam a tartomanyban")
})()
const ERVENYES = `${torzsszam}-2-41`
const HIBAS_ELLENORZO = `${torzsszam.slice(0, 7)}${(Number(torzsszam[7]) + 1) % 10}-2-41`

const urlap = (mezok: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(mezok)) f.set(k, v)
  return f
}

/**
 * A CEGES VASARLAS ADATAI (kartya c977aed2). MI PIROSIT: ha egy maganszemely adoszamot visz at; ha ceges vasarlas ervenytelen
 * (alakilag vagy ellenorzo szamjegyre) adoszammal atmegy; ha a cegnev hianyzik; ha a kulon szamlazasi cimnel a SZALLITASI cegnevet
 * nezi; ha a "HU" elotagu kozossegi szam atjut.
 */
describe("cegesAdatok", () => {
  it("magánszemélynek nincs adószáma, akkor sem, ha a mező kitöltve maradt", () => {
    expect(cegesAdatok(urlap({ [ADOSZAM_MEZO]: ERVENYES }))).toEqual({
      ok: true,
      ceges: false,
      adoszam: null,
    })
  })

  it("céges vásárlás: az adószám egységesítve megy át, cégnévvel", () => {
    const r = cegesAdatok(
      urlap({
        [CEGES_MEZO]: "on",
        same_as_billing: "on",
        "shipping_address.company": "Minta Kft.",
        [ADOSZAM_MEZO]: ` ${torzsszam} 2 41 `,
      }),
    )
    expect(r).toEqual({ ok: true, ceges: true, adoszam: ERVENYES })
  })

  it("cégnév nélkül nem megy", () => {
    const r = cegesAdatok(
      urlap({
        [CEGES_MEZO]: "on",
        same_as_billing: "on",
        [ADOSZAM_MEZO]: ERVENYES,
      }),
    )
    expect(r.ok).toBe(false)
  })

  it("külön számlázási címnél a SZÁMLÁZÁSI cégnév számít, nem a szállítási", () => {
    const csakSzallitasi = cegesAdatok(
      urlap({
        [CEGES_MEZO]: "on",
        "shipping_address.company": "Szállítási Kft.",
        [ADOSZAM_MEZO]: ERVENYES,
      }),
    )
    expect(csakSzallitasi.ok).toBe(false)
    const szamlazasi = cegesAdatok(
      urlap({
        [CEGES_MEZO]: "on",
        "billing_address.company": "Számlázási Kft.",
        [ADOSZAM_MEZO]: ERVENYES,
      }),
    )
    expect(szamlazasi).toEqual({ ok: true, ceges: true, adoszam: ERVENYES })
  })

  it("rossz alak és rossz ellenőrző számjegy külön mondatot kap", () => {
    const alap = {
      [CEGES_MEZO]: "on",
      same_as_billing: "on",
      "shipping_address.company": "Minta Kft.",
    }
    const alak = cegesAdatok(urlap({ ...alap, [ADOSZAM_MEZO]: "12345" }))
    const jegy = cegesAdatok(
      urlap({ ...alap, [ADOSZAM_MEZO]: HIBAS_ELLENORZO }),
    )
    expect(alak).toMatchObject({ ok: false })
    expect(jegy).toMatchObject({ ok: false })
    expect((alak as { uzenet: string }).uzenet).toMatch(/alakja/)
    expect((jegy as { uzenet: string }).uzenet).toMatch(/ellenőrző számjegye/)
  })

  it("a HU előtagú közösségi szám és az üres mező nem fogadható el", () => {
    const alap = {
      [CEGES_MEZO]: "on",
      same_as_billing: "on",
      "shipping_address.company": "Minta Kft.",
    }
    expect(
      cegesAdatok(urlap({ ...alap, [ADOSZAM_MEZO]: `HU${torzsszam}` })).ok,
    ).toBe(false)
    expect(cegesAdatok(urlap({ ...alap, [ADOSZAM_MEZO]: "" })).ok).toBe(false)
    expect(cegesAdatok(urlap(alap)).ok).toBe(false)
  })
})

describe("cimMetadata", () => {
  it("a céges adószám tax_id-ként, magánszemélynél null (a korábbi kitöltés nem marad)", () => {
    expect(cimMetadata(ERVENYES)).toEqual({ tax_id: ERVENYES })
    expect(cimMetadata(null)).toEqual({ tax_id: null })
  })
})
