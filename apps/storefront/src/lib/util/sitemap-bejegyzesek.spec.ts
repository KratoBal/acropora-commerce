import { describe, expect, it } from "vitest"

import { sitemapBejegyzesek, utolsoModositas } from "./sitemap-bejegyzesek"

const BEMENET = {
  origin: "https://shop.acropora.hu",
  orszagKodok: ["hu"] as const,
  kategoriak: [
    { handle: "korallok", updated_at: "2026-09-01T10:00:00.000Z" },
    { handle: "korallok/sps", updated_at: "2026-09-02T10:00:00.000Z" },
  ],
  termekek: [
    { handle: "acropora-tenuis", updated_at: "2026-09-03T10:00:00.000Z" },
  ],
}

describe("sitemap bejegyzesek", () => {
  /**
   * A TOBBSZINTU KATEGORIA A LENYEG. A Medusa `handle` erteke a TELJES ut
   * (`korallok/sps`), es a lap `/hu/categories/korallok/sps` alatt all. Ha
   * valaki egy szegmensnek veszi, a sitemap egy nem letezo cimet ajanlana --
   * pontosan az a hibafajta, amibol ez a fajl szuletett, csak forditva.
   */
  it("a tobbszintu kategoria teljes utat kap", () => {
    const utak = sitemapBejegyzesek(BEMENET).map((b) => b.url)
    expect(utak).toContain(
      "https://shop.acropora.hu/hu/categories/korallok/sps",
    )
  })

  it("a fooldal, a store-lap, a kategoriak es a termekek mind bekerulnek", () => {
    const utak = sitemapBejegyzesek(BEMENET).map((b) => b.url)
    expect(utak).toEqual([
      "https://shop.acropora.hu/hu",
      "https://shop.acropora.hu/hu/store",
      "https://shop.acropora.hu/hu/categories/korallok",
      "https://shop.acropora.hu/hu/categories/korallok/sps",
      "https://shop.acropora.hu/hu/products/acropora-tenuis",
    ])
  })

  /**
   * ES AMI NEM KERUL BE. Ez a keszlet donto allitasa: egy MINDENT felsorolo
   * valtozat a fenti ketton atmenne, ezen nem. A fiok-, kosar-, penztar- es
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
   * visszahozza a ketszeres kodolas hibajat. Ez az allitas azt orzi, hogy a
   * sitemap ugyanazt a nyers alakot adja, mint a lap canonicalja.
   */
  it("az ekezetes handle valtozatlanul megy at", () => {
    const kodolt = "nyos-reef-putty-200g-k%C3%A9tkomponens%C5%B1"
    const utak = sitemapBejegyzesek({
      ...BEMENET,
      kategoriak: [],
      termekek: [{ handle: kodolt }],
    }).map((b) => b.url)
    expect(utak).toContain(`https://shop.acropora.hu/hu/products/${kodolt}`)
  })

  /** Handle nelkul nincs cim: egy `/hu/products/undefined` alak rosszabb a hianynal. */
  it("a handle nelkuli sor kimarad", () => {
    const utak = sitemapBejegyzesek({
      ...BEMENET,
      kategoriak: [],
      termekek: [{ handle: null }, { handle: "van-handle" }],
    }).map((b) => b.url)
    expect(utak).toEqual([
      "https://shop.acropora.hu/hu",
      "https://shop.acropora.hu/hu/store",
      "https://shop.acropora.hu/hu/products/van-handle",
    ])
  })

  /**
   * TOBB ORSZAGKOD ESETEN MINDEGYIK SAJAT CIMET KAP. Ma egy regio van (merve a
   * stage bolton: 1), tehat ez az ag valos adaton NEM futna le -- ezert all
   * sajat, szandekosan ketkodos bemenet a fixtuaban.
   */
  it("tobb orszagkod eseten mindegyik sajat cimet kap", () => {
    const utak = sitemapBejegyzesek({
      ...BEMENET,
      orszagKodok: ["hu", "de"],
      kategoriak: [],
      termekek: [{ handle: "x" }],
    }).map((b) => b.url)
    expect(utak).toContain("https://shop.acropora.hu/hu/products/x")
    expect(utak).toContain("https://shop.acropora.hu/de/products/x")
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
      ...BEMENET,
      kategoriak: [],
      termekek: [{ handle: "x", updated_at: "nem-datum" }],
    }).find((b) => b.url.endsWith("/products/x"))
    expect(bejegyzes).toBeDefined()
    expect(bejegyzes?.lastModified).toBeUndefined()
  })
})
