import { describe, expect, it } from "vitest"

import { valogatasCanonical } from "./lap-canonical"
import {
  SITEMAP_TIPUSOK,
  sitemapReszek,
  termekesKategoriakBol,
} from "./sitemap-bejegyzesek"
import { sitemapIndexXml, urlsetXml } from "./sitemap-xml"

/**
 * A SITEMAP TIPUSONKENT (FE-5, Balazs 6. dontese, 2026-10-07). MI PIROSITJA:
 * egy cim rossz tipusba kerul; az ures kategoria bekerul (vagy a leszarmazottja
 * miatt nem ures kategoria kimarad); egy hianyzo `categories` mezo kiuriti a
 * kategoria-sitemapet; a landing nem a /valogatas/ cimen all; az XML nem
 * escape-eli a `&`-t.
 */
const ORIGIN = "https://shop.acropora.hu"
const KATEGORIAK = [
  { id: "c_gyoker", handle: "korallok", parent_category_id: null },
  { id: "c_sps", handle: "sps", parent_category_id: "c_gyoker" },
  { id: "c_ures", handle: "ures-ag", parent_category_id: null },
]

const reszek = (termekes?: Set<string>) =>
  sitemapReszek({
    origin: ORIGIN,
    kategoriak: KATEGORIAK,
    termekesKategoriak: termekes,
    orszagok: [
      { countryCode: "hu", termekek: [{ handle: "acropora-tenuis" }] },
    ],
    markak: [{ handle: "aquaforest" }],
    landingek: [{ handle: "kh-potlas" }],
  })

describe("a sitemap részei típusonként", () => {
  it("minden cím a saját típusában áll", () => {
    const r = reszek()
    expect(Object.keys(r).sort()).toEqual([...SITEMAP_TIPUSOK].sort())
    expect(r.lapok.map((b) => b.url)).toEqual([
      `${ORIGIN}/hu`,
      `${ORIGIN}/hu/store`,
    ])
    expect(r.termekek.map((b) => b.url)).toEqual([
      `${ORIGIN}/hu/termek/acropora-tenuis`,
    ])
    expect(r.markak.map((b) => b.url)).toEqual([
      `${ORIGIN}/hu/marka/aquaforest`,
    ])
    expect(r.valogatasok.map((b) => b.url)).toEqual([
      `${ORIGIN}/hu/valogatas/kh-potlas`,
    ])
  })

  it("az üres kategória kimarad, a leszármazottja miatt nem üres szülő marad", () => {
    const urlek = reszek(new Set(["c_sps"])).kategoriak.map((b) => b.url)
    expect(urlek).toEqual([
      `${ORIGIN}/hu/categories/korallok`,
      `${ORIGIN}/hu/categories/sps`,
    ])
  })

  it("termékadat nélkül nem szűr: egy hiányzó mező nem üríti ki a listát", () => {
    expect(reszek(undefined).kategoriak).toHaveLength(3)
    expect(
      termekesKategoriakBol([{ handle: "a" }, { handle: "b" }]),
    ).toBeUndefined()
    expect(
      termekesKategoriakBol([
        { handle: "a", categories: [{ id: "c_sps" }] },
        { handle: "b", categories: [] },
      ]),
    ).toEqual(new Set(["c_sps"]))
  })

  it("a saját robots-tiltású termék kimarad a termék-sitemapből (t13)", () => {
    const r = sitemapReszek({
      origin: ORIGIN,
      kategoriak: [],
      orszagok: [
        {
          countryCode: "hu",
          termekek: [
            {
              handle: "blue-life-nitrate-fx",
              metadata: { seo_robots: "noindex, nofollow" },
            },
            { handle: "acropora-tenuis", metadata: null },
          ],
        },
      ],
    })
    expect(r.termekek.map((b) => b.url)).toEqual([
      `${ORIGIN}/hu/termek/acropora-tenuis`,
    ])
  })

  it("a válogatás kanonikus címe /hu/valogatas/{slug}", () => {
    expect(valogatasCanonical("hu", "kh-potlas")).toBe(
      "/hu/valogatas/kh-potlas",
    )
  })
})

describe("a sitemap XML-je", () => {
  it("urlset: loc és lastmod, a & escape-elve", () => {
    const xml = urlsetXml([
      {
        url: `${ORIGIN}/hu/termek/a&b`,
        lastModified: new Date("2026-10-01T00:00:00.000Z"),
      },
      { url: `${ORIGIN}/hu` },
    ])
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(xml).toContain(
      `<url><loc>${ORIGIN}/hu/termek/a&amp;b</loc><lastmod>2026-10-01T00:00:00.000Z</lastmod></url>`,
    )
    expect(xml).toContain(`<url><loc>${ORIGIN}/hu</loc></url>`)
    expect(xml).not.toMatch(/&b</)
  })

  it("index: a típusonkénti címek, üresen is érvényes", () => {
    const xml = sitemapIndexXml([`${ORIGIN}/sitemap/termekek.xml`])
    expect(xml).toContain(
      `<sitemap><loc>${ORIGIN}/sitemap/termekek.xml</loc></sitemap>`,
    )
    expect(sitemapIndexXml([])).toContain("<sitemapindex")
  })
})
