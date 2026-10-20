import { describe, expect, it } from "vitest"

import { KEZDOLAP_SZOVEGEK, szovegKereso, szovegMintaKereso } from "./szovegek"
import { ALAP_DIAK, kezdolapAdat } from "./tartalom"

/**
 * A SZERKESZTHETO KEZDOLAP-SZOVEGEK SZERZODESE.
 *
 * MI PIROSIT: ha egy kulcs ketszer szerepel a katalogusban (az OS szerkesztoje
 * ket mezot mutatna ugyanarra); ha egy kulcs nem illik a backend validatoranak
 * mintajara (a mentes 400-at adna, es a szerkeszto nem tudna menteni); ha az
 * OS-tol kapott szoveg nem nyer a kezdoertek felett, vagy az ures szoveg nem
 * ures marad; ha a hianyzo kulcs nem a kezdoerteket adja; ha egy ismeretlen
 * (elgepelt) kulcs csendben kiut; ha a kezdodiak megsertik a backend hatarait.
 */
describe("a kezdőlap szövegkatalógusa", () => {
  it("a kulcsok egyediek és a backend kulcs-mintájára illenek", () => {
    const kulcsok = KEZDOLAP_SZOVEGEK.map((s) => s.kulcs)
    expect(new Set(kulcsok).size).toBe(kulcsok.length)
    expect(kulcsok.length).toBeGreaterThan(0)
    for (const kulcs of kulcsok)
      expect(kulcs, kulcs).toMatch(/^[a-z0-9][a-z0-9_.-]{0,79}$/)
    // a backend legfeljebb 400 kulcsot fogad, 2000 karakteres szovegekkel
    expect(kulcsok.length).toBeLessThanOrEqual(400)
    for (const s of KEZDOLAP_SZOVEGEK)
      expect(s.alap.length).toBeLessThanOrEqual(2000)
  })

  it("az OS szövege nyer, az üres is; ami hiányzik, annak a kezdőérték áll", () => {
    const sz = szovegKereso({
      "hero.tenyek.1.cim": "Más cím",
      "hero.tenyek.2.cim": "",
    })
    expect(sz("hero.tenyek.1.cim")).toBe("Más cím")
    expect(sz("hero.tenyek.2.cim")).toBe("")
    expect(sz("hero.tenyek.3.cim")).toBe("4,9 / 5")
    expect(szovegKereso(null)("hero.tenyek.1.cim")).toBe("Személyes átvétel")
  })

  it("egy ismeretlen kulcs hiba, nem üres szöveg", () => {
    expect(() => szovegKereso(null)("hero.nincs.ilyen")).toThrow(/ismeretlen/)
    // az objektum-prototipus kulcsai nem szamitanak kuldott szovegnek
    expect(() => szovegKereso({})("constructor")).toThrow(/ismeretlen/)
  })
})

describe("a kitalált tények jelölése", () => {
  it("a minta-kulcsok a kezdőértéknél minta, az OS saját értékénél (akár üresnél) már nem", () => {
    const minta = szovegMintaKereso(null)
    expect(minta("hero.tenyek.3.cim")).toBe(true)
    expect(minta("hero.tenyek.3.szoveg")).toBe(true)
    // a szöveges címek és gombok jelölés nélkül állnak
    expect(minta("hero.tenyek.1.cim")).toBe(false)
    expect(
      szovegMintaKereso({ "hero.tenyek.3.cim": "4,8 / 5" })(
        "hero.tenyek.3.cim",
      ),
    ).toBe(false)
    expect(
      szovegMintaKereso({ "hero.tenyek.3.cim": "" })("hero.tenyek.3.cim"),
    ).toBe(false)
  })

  it("minden kezdődia minta-jelölt, és az OS diái soha nem", () => {
    for (const dia of ALAP_DIAK) expect(dia.minta).toBe(true)
    const osDia = { ...ALAP_DIAK[0], minta: undefined }
    expect(
      kezdolapAdat({ texts: {}, slides: [osDia] }).diak[0].minta,
    ).toBeUndefined()
  })
})

describe("a hero diái", () => {
  it("amíg az OS nem írt semmit, a terv három diája áll, utána az OS diái, akár üresen is", () => {
    expect(kezdolapAdat(null).diak).toHaveLength(3)
    expect(kezdolapAdat({ texts: {}, slides: [] }).diak).toEqual([])
    expect(
      kezdolapAdat({ texts: {}, slides: [ALAP_DIAK[0]] }).diak,
    ).toHaveLength(1)
  })

  it("a kezdődiák betartják a backend határait: legfeljebb öt, link csak bolti út", () => {
    expect(ALAP_DIAK.length).toBeLessThanOrEqual(5)
    const BOLTI_UT = /^\/(?![/\\])[^\s\\]*$/
    for (const dia of ALAP_DIAK)
      for (const href of [dia.cta_href, dia.cta2_href])
        if (href !== null) expect(href).toMatch(BOLTI_UT)
  })
})
