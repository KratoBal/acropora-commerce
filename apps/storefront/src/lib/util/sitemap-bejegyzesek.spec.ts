import { describe, expect, it } from "vitest"

import {
  sitemapBejegyzesek,
  utSzegmensKodolt,
  utolsoModositas,
} from "./sitemap-bejegyzesek"

const BEMENET = {
  origin: "https://shop.acropora.hu",
  kategoriak: [
    { handle: "korallok", updated_at: "2026-09-01T10:00:00.000Z" },
    { handle: "korallok/sps", updated_at: "2026-09-02T10:00:00.000Z" },
  ],
  orszagok: [
    {
      countryCode: "hu",
      termekek: [
        { handle: "acropora-tenuis", updated_at: "2026-09-03T10:00:00.000Z" },
      ],
    },
  ],
}

describe("sitemap bejegyzesek", () => {
  /**
   * A TOBBSZINTU KATEGORIA. A Medusa `handle` erteke a TELJES ut
   * (`korallok/sps`), es a lap `/hu/categories/korallok/sps` alatt all. Ha
   * valaki egy szegmensnek veszi, a sitemap egy nem letezo cimet ajanlana --
   * ugyanaz a hibafajta, amibol ez a fajl szuletett, csak forditva.
   */
  it("a tobbszintu kategoria teljes utat kap", () => {
    const utak = sitemapBejegyzesek(BEMENET).map((b) => b.url)
    expect(utak).toContain(
      "https://shop.acropora.hu/hu/categories/korallok/sps",
    )
  })

  it("a fooldal, a store-lap, a lablec oldalai, a kategoriak es a termekek mind bekerulnek", () => {
    const utak = sitemapBejegyzesek(BEMENET).map((b) => b.url)
    expect(utak).toEqual([
      "https://shop.acropora.hu/hu",
      "https://shop.acropora.hu/hu/store",
      "https://shop.acropora.hu/hu/elerhetosegek",
      "https://shop.acropora.hu/hu/szallitas",
      "https://shop.acropora.hu/hu/fizetes",
      "https://shop.acropora.hu/hu/categories/korallok",
      "https://shop.acropora.hu/hu/categories/korallok/sps",
      "https://shop.acropora.hu/hu/termek/acropora-tenuis",
    ])
  })

  /**
   * MINDEN ORSZAG A SAJAT TERMEKLISTAJABOL KAP CIMET -- ES EZ AZ EGYETLEN
   * ALLITAS, AMI EGY MERT HIBARA IR.
   *
   * Az elso valtozat EGY orszag termekeit kerte le, es minden orszagra ugyanazt
   * a listat sorolta fel (acrobot lelete, 2026-09-15). Ma egy regio van, tehat
   * az a kimenet meg helyes volt: valos adaton ez az ag SOSEM futott volna le,
   * es a hiba akkor jelent volna meg, amikor senki nem koti ossze vele.
   *
   * A KET LISTA SZANDEKOSAN KULONBOZIK, es az allitas NEVESITI, melyik cim
   * melyikbol jott: egy "minden termek minden orszaghoz" valtozat pontosan a
   * ket `not.toContain` soron bukik el.
   */
  it("minden orszag a SAJAT termeklistajabol kap cimet", () => {
    const utak = sitemapBejegyzesek({
      origin: "https://shop.acropora.hu",
      kategoriak: [],
      orszagok: [
        { countryCode: "hu", termekek: [{ handle: "csak-magyar" }] },
        { countryCode: "de", termekek: [{ handle: "csak-nemet" }] },
      ],
    }).map((b) => b.url)

    expect(utak).toContain("https://shop.acropora.hu/hu/termek/csak-magyar")
    expect(utak).toContain("https://shop.acropora.hu/de/termek/csak-nemet")
    expect(utak).not.toContain("https://shop.acropora.hu/de/termek/csak-magyar")
    expect(utak).not.toContain("https://shop.acropora.hu/hu/termek/csak-nemet")
  })

  /**
   * ES AMI NEM KERUL BE. Ez a keszlet masik donto allitasa: egy MINDENT
   * felsorolo valtozat a tobbin atmenne, ezen nem. A fiok-, kosar-, penztar- es
   * rendeles-utak nem nyilvanos tartalmak, a gyujtemeny-lapokra pedig ma
   * egyetlen menupont sem mutat.
   */
  it("a nem nyilvanos es a nem kinalt utak kimaradnak", () => {
    const utak = sitemapBejegyzesek(BEMENET).map((b) => b.url)
    for (const tiltott of [
      "/account",
      "/cart",
      "/checkout",
      "/order",
      "/collections",
    ]) {
      expect(utak.some((ut) => ut.includes(tiltott))).toBe(false)
    }
  })

  /**
   * A HANDLE KODOLVA MARAD. A katalogusban van ekezetes handle, es a
   * `lap-canonical.ts` fejlece kimondja: aki dekodolast tesz az utvonal-epitesbe,
   * visszahozza a ketszeres kodolas hibajat.
   */
  it("az ekezetes handle valtozatlanul megy at", () => {
    const kodolt = "nyos-reef-putty-200g-k%C3%A9tkomponens%C5%B1"
    const utak = sitemapBejegyzesek({
      origin: "https://shop.acropora.hu",
      kategoriak: [],
      orszagok: [{ countryCode: "hu", termekek: [{ handle: kodolt }] }],
    }).map((b) => b.url)
    expect(utak).toContain(`https://shop.acropora.hu/hu/termek/${kodolt}`)
  })

  /**
   * S3 (commerce-audit-p1). A Medusa a handle-t DEKODOLT, ekezetes alakban is
   * adhatja; a sitemap protokoll kodolt cimet var, es a lap canonicalja is az.
   * MI PIROSIT: ha a nyers ekezetes handle kodolatlanul kerulne a cimbe; ha a
   * mar kodolt handle ketszer kodolodna (`%25C3`); ha a ket bemenet-alak nem
   * UGYANAZT a cimet adna.
   */
  it("az ekezetes handle KODOLVA kerul a cimbe, a mar kodolt nem kodolodik ketszer", () => {
    const nyers = "nyos-reef-putty-200g-kétkomponensű"
    const kodolt = "nyos-reef-putty-200g-k%C3%A9tkomponens%C5%B1"
    const cimek = (handle: string) =>
      sitemapBejegyzesek({
        origin: "https://shop.acropora.hu",
        kategoriak: [{ handle: `termékek/${handle}` }],
        markak: [{ handle }],
        landingek: [{ handle }],
        orszagok: [{ countryCode: "hu", termekek: [{ handle }] }],
      })
        .map((b) => b.url)
        .filter((url) => url.includes("nyos-reef"))
    expect(cimek(nyers)).toEqual(cimek(kodolt))
    expect(cimek(nyers)).toEqual([
      `https://shop.acropora.hu/hu/categories/term%C3%A9kek/${kodolt}`,
      `https://shop.acropora.hu/hu/marka/${kodolt}`,
      `https://shop.acropora.hu/hu/termek/${kodolt}`,
      `https://shop.acropora.hu/hu/valogatas/${kodolt}`,
    ])
    for (const url of cimek(nyers)) expect(url).not.toContain("%25")
  })

  it("az utSzegmensKodolt hibas % sorozatnal a nyers szoveget kodolja", () => {
    expect(utSzegmensKodolt("50%-os")).toBe("50%25-os")
    expect(utSzegmensKodolt("korallok")).toBe("korallok")
    expect(utSzegmensKodolt("korallt%C3%A1pok")).toBe("korallt%C3%A1pok")
  })

  /** Handle nelkul nincs cim: egy `/hu/termek/undefined` alak rosszabb a hianynal. */
  it("a handle nelkuli sor kimarad", () => {
    const utak = sitemapBejegyzesek({
      origin: "https://shop.acropora.hu",
      kategoriak: [],
      orszagok: [
        {
          countryCode: "hu",
          termekek: [{ handle: null }, { handle: "van-handle" }],
        },
      ],
    }).map((b) => b.url)
    expect(utak).toEqual([
      "https://shop.acropora.hu/hu",
      "https://shop.acropora.hu/hu/store",
      "https://shop.acropora.hu/hu/elerhetosegek",
      "https://shop.acropora.hu/hu/szallitas",
      "https://shop.acropora.hu/hu/fizetes",
      "https://shop.acropora.hu/hu/termek/van-handle",
    ])
  })

  /**
   * A ROSSZ DATUM NEM EJTHETI EL A CIMET. Az `updated_at` a Medusa valaszabol
   * jon, tehat ismeretlen alaku; a sitemap erteke a CIM, a datum csak segitseg.
   */
  it("a hasznalhatatlan datum elmarad, a cim marad", () => {
    expect(utolsoModositas("nem-datum")).toBeUndefined()
    expect(utolsoModositas(42)).toBeUndefined()
    expect(utolsoModositas(null)).toBeUndefined()
    expect(utolsoModositas("2026-09-03T10:00:00.000Z")).toBeInstanceOf(Date)

    const bejegyzes = sitemapBejegyzesek({
      origin: "https://shop.acropora.hu",
      kategoriak: [],
      orszagok: [
        {
          countryCode: "hu",
          termekek: [{ handle: "x", updated_at: "nem-datum" }],
        },
      ],
    }).find((b) => b.url.endsWith("/termek/x"))
    expect(bejegyzes).toBeDefined()
    expect(bejegyzes?.lastModified).toBeUndefined()
  })

  /**
   * A MARKAOLDALAK (SEO P0 PR 11). MI PIROSITJA: ha a marka nem kerulne be, ha
   * a regi `/collections/` cimen kerulne be, vagy ha a handle nelkuli sor cimet
   * kapna.
   */
  it("a markak a /marka/ cimukkel kerulnek be, a handle nelkuli sor kimarad", () => {
    const utak = sitemapBejegyzesek({
      ...BEMENET,
      markak: [
        { handle: "aquaforest", updated_at: "2026-10-01T10:00:00.000Z" },
        { handle: null },
      ],
    }).map((b) => b.url)
    expect(utak).toContain("https://shop.acropora.hu/hu/marka/aquaforest")
    expect(utak.filter((u) => u.includes("/marka/"))).toHaveLength(1)
    expect(utak.some((u) => u.includes("/collections/"))).toBe(false)
  })
})
