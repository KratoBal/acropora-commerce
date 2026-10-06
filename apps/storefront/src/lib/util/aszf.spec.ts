import { describe, expect, it } from "vitest"

import { SAJAT_HIVATKOZASOK } from "@modules/layout/templates/footer/hivatkozasok"

import {
  ADATKEZELES_CIM,
  ASZF_CIM,
  ASZF_VERZIO,
  aszfElfogadas,
  aszfHatalyDatum,
  regisztracioHiba,
} from "./aszf"

/**
 * AZ ASZF-ELFOGADAS REKORDJA. MI PIROSIT: ha az idopont nem ISO; ha a verzio
 * vagy a dokumentum cime hianyzik; ha a cim nem a lablec egyetlen listajabol
 * jon (akkor elesiteskor az egyik helyen atirodna, a masikon nem).
 */
describe("az ÁSZF-elfogadás rekordja", () => {
  const most = new Date("2026-09-29T11:30:00.000Z")

  it("bekapcsolt Fogyasztóbarátnál a forrás, a hatálydátum és a lenyomat (2026-10-06)", () => {
    expect(
      aszfElfogadas(most, {
        tipus: "fogyasztobarat",
        hatalyos: "2026-10-05",
        lenyomat: "sha256:abc",
      }),
    ).toEqual({
      idopont: "2026-09-29T11:30:00.000Z",
      verzio: "fogyasztobarat-JPNFMVH0",
      dokumentum: "https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0",
      hatalyos: "2026-10-05",
      lenyomat: "sha256:abc",
    })
    expect(ASZF_VERZIO).not.toContain("unas")
  })

  it("ha a lekérés nem sikerült, a rekord kimondja: lenyomat nincs, dátum nincs", () => {
    expect(
      aszfElfogadas(most, {
        tipus: "fogyasztobarat",
        hatalyos: null,
        lenyomat: null,
      }),
    ).toMatchObject({ hatalyos: null, lenyomat: "nincs" })
  })

  it("kikapcsolt Fogyasztóbarátnál azt rögzíti, amit a vevő kapott: a mai bolt ÁSZF-jét", () => {
    expect(aszfElfogadas(most, { tipus: "mai-bolt" })).toEqual({
      idopont: "2026-09-29T11:30:00.000Z",
      verzio: "unas-shop-2026-09-29",
      dokumentum: "https://shop.acropora.hu/shop_help.php?tab=terms",
    })
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
 * A HATALYDATUM A DOKUMENTUM SZOVEGEBOL. MI PIROSIT: ha a Fogyasztobarat
 * fejlecenek alakjabol (a datum egy `inserted_var` spanban) nem olvassa ki; ha
 * datum nelkuli szovegre kitalal egyet.
 */
describe("az ÁSZF hatálydátuma", () => {
  it("a Fogyasztóbarát fejlécéből, a span mögül", () => {
    const fejlec =
      '<p style="text-align: center;"><span class="inserted_var">bolt.example</span> - hatályos ettől a naptól: <span class="inserted_var">2026-10-05</span></p>'
    expect(aszfHatalyDatum(fejlec)).toBe("2026-10-05")
  })

  it("dátum nélküli szövegre null, nem kitalált dátum", () => {
    expect(aszfHatalyDatum("<p>Hibakód: 1002</p>")).toBeNull()
    expect(aszfHatalyDatum("<p>2026-10-05</p>")).toBeNull()
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
