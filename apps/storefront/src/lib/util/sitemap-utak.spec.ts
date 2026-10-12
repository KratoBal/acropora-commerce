import { describe, expect, it, vi } from "vitest"

/**
 * A SITEMAP ROUTE-KEZELOI (FE-5). A valodi `app/sitemap.xml/route.ts` es
 * `app/sitemap/[tipus]/route.ts` fut, a hoszt-fejleccel es kifigurazott
 * adatreteggel. MI PIROSITJA: az index a teszt hoszton cimet ad; a valogatas a
 * bekotese elott az indexbe kerul; egy ismeretlen tipus ures, ervenyesnek
 * latszo sitemapet ad 404 helyett.
 */
const fejlecek = vi.hoisted(() => ({ host: "shop.acropora.hu" }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: fejlecek.host }),
}))
vi.mock("@lib/data/sitemap-adat", () => ({
  LANDING_FORRAS: null,
  sitemapBemenet: async (origin: string) => ({
    origin,
    orszagok: [
      { countryCode: "hu", termekek: [{ handle: "acropora-tenuis" }] },
    ],
    kategoriak: [],
    markak: [],
  }),
}))

import { GET as index } from "../../app/sitemap.xml/route"
import { GET as tipus } from "../../app/sitemap/[tipus]/route"

const hivas = (t: string) =>
  tipus(new Request("https://shop.acropora.hu/x"), {
    params: Promise.resolve({ tipus: t }),
  })

describe("a sitemap route-kezelői", () => {
  it("az index az éles hoszton a típusokat sorolja, a válogatást bekötés nélkül nem", async () => {
    fejlecek.host = "shop.acropora.hu"
    const xml = await (await index()).text()
    for (const t of ["lapok", "kategoriak", "markak", "termekek"])
      expect(xml).toContain(`https://shop.acropora.hu/sitemap/${t}.xml`)
    expect(xml).not.toContain("valogatasok")
  })

  it("a teszt hoszton az index üres", async () => {
    fejlecek.host = "shop-staging.acropora.hu"
    const xml = await (await index()).text()
    expect(xml).toContain("<sitemapindex")
    expect(xml).not.toContain("<loc>")
  })

  it("egy típus a saját címeit adja; az ismeretlen típus 404", async () => {
    fejlecek.host = "shop.acropora.hu"
    const termekek = await hivas("termekek.xml")
    expect(termekek.headers.get("content-type")).toContain("application/xml")
    expect(await termekek.text()).toContain(
      "<loc>https://shop.acropora.hu/hu/termek/acropora-tenuis</loc>",
    )
    expect((await hivas("nincs.xml")).status).toBe(404)
    expect((await hivas("termekek")).status).toBe(404)
  })
})
