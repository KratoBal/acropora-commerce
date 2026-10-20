import { describe, expect, it } from "vitest"

import { KEZDOLAP_SZOVEGEK, szovegKereso, szovegek } from "./szovegek"
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
  it("a tények a kezdőértéknél minta, az OS saját értékénél (akár üresnél) már nem", () => {
    const { minta } = szovegek(null)
    for (const kulcs of [
      "hero.tenyek.3.cim",
      "velemenyek.pont",
      "velemenyek.2.idezet",
      "markak.1",
      "bolt.cim_ertek",
      "bolt.nyitva_ertek",
      "halado.1.szoveg",
    ])
      expect(minta(kulcs), kulcs).toBe(true)
    // a szöveges címek és gombok jelölés nélkül állnak
    for (const kulcs of [
      "hero.tenyek.1.cim",
      "mit.cim",
      "kezdo.cim",
      "bolt.gomb.felirat",
    ])
      expect(minta(kulcs), kulcs).toBe(false)
    expect(
      szovegek({ "hero.tenyek.3.cim": "4,8 / 5" }).minta("hero.tenyek.3.cim"),
    ).toBe(false)
    expect(szovegek({ "velemenyek.1.nev": "" }).minta("velemenyek.1.nev")).toBe(
      false,
    )
  })

  it("minden kezdődia minta-jelölt, és az OS diái soha nem", () => {
    for (const dia of ALAP_DIAK) expect(dia.minta).toBe(true)
    const osDia = { ...ALAP_DIAK[0], minta: undefined }
    expect(
      kezdolapAdat({ texts: {}, slides: [osDia] }).diak[0].minta,
    ).toBeUndefined()
  })
})

describe("a mezők típusa", () => {
  it("egy kulcsot csak a saját típusával lehet olvasni", () => {
    const k = szovegek(null)
    expect(() => k.szoveg("mit.1.kep")).toThrow(/tipusa/)
    expect(() => k.link("mit.cim")).toThrow(/tipusa/)
    expect(() => k.kep("mit.cim")).toThrow(/tipusa/)
  })

  it("a link és a kép csak biztonságos címet ad: bolti út vagy http(s)", () => {
    const rossz = [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//evil.example/x",
      "/\\evil.example",
      "ftp://x/y",
      "hu/store",
      "/a b",
    ]
    for (const r of rossz) {
      const k = szovegek({ "mit.1.l1.link": r, "mit.1.kep": r })
      expect(k.link("mit.1.l1.link"), r).toBeNull()
      expect(k.kep("mit.1.kep"), r).toBeNull()
    }
    const jo = szovegek({
      "mit.1.l1.link": "https://maps.example/x",
      "mit.1.l2.link": "/categories/korallok",
      "mit.1.kep": "https://shop.example/static/a.jpg",
    })
    expect(jo.link("mit.1.l1.link")).toEqual({
      href: "https://maps.example/x",
      kulso: true,
    })
    expect(jo.link("mit.1.l2.link")).toEqual({
      href: "/categories/korallok",
      kulso: false,
    })
    expect(jo.kep("mit.1.kep")).toBe("https://shop.example/static/a.jpg")
  })

  it("a katalógus minden típusa ismert, és a kezdő link-értékek biztonságosak", () => {
    const k = szovegek(null)
    for (const sor of KEZDOLAP_SZOVEGEK) {
      expect(["szoveg", "link", "kep"]).toContain(sor.tipus)
      if (sor.tipus === "link")
        expect(() => k.link(sor.kulcs), sor.kulcs).not.toThrow()
      if (sor.tipus === "link" && sor.alap !== "")
        expect(k.link(sor.kulcs), sor.kulcs).not.toBeNull()
    }
  })
})

describe("a hero diái", () => {
  it("amíg az OS nem írt semmit, a terv három diája áll, utána az OS diái, akár üresen is", () => {
    expect(kezdolapAdat(null).diak).toHaveLength(3)
    expect(kezdolapAdat({ texts: {}, slides: [] }).diak).toEqual([])
    // null (barracuda, #553): az OS csak szoveget szerkesztett, a diak a
    // kezdodiak maradnak, jelolve; az ures lista viszont "nincs hero"
    const nullDiak = kezdolapAdat({
      texts: { "hero.tenyek.1.cim": "x" },
      slides: null,
    }).diak
    expect(nullDiak).toHaveLength(3)
    for (const dia of nullDiak) expect(dia.minta).toBe(true)
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
