import { afterEach, describe, expect, it } from "vitest"

import { GET } from "./route"

const kerek = (kveri = "") =>
  GET({
    nextUrl: new URL(`https://teszt.example/api/health/lablec-linkek${kveri}`),
  } as never)

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_URL
  delete process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED
})

/**
 * A LABLEC REGI-BOLT LINKJEINEK KAPUJA (audit P1/11). MI PIROSIT: ha az atallas
 * elotti kerdes (a regi bolt hosztja) nulla linket adna; ha a teszt host (ahova
 * nem mutat link) hibat jelezne; ha a Fogyasztobarat-kapcsolo allasa nem
 * szamitana (bekapcsolva az ASZF/adatkezeles sajat oldalon all); ha egy
 * ervenytelen host kerdese nem 400; ha a kapu a sajat Elerhetosegek linket is
 * regi-boltnak szamolna.
 */
describe("GET /api/health/lablec-linkek", () => {
  it("az átállás előtt megkérdezhető: a regi bolt hosztjára a Kedvenceim és a két jogi dokumentum mutat", async () => {
    const torzs = await (await kerek("?host=shop.acropora.hu")).json()
    expect(torzs.status).toBe("old_shop_links_remain")
    const cimkek = torzs.links.map((l: { cimke: string }) => l.cimke)
    expect(cimkek).toContain("Kedvenceim")
    // a Fizetés, a Szállítás és a Képes tájékoztató már saját oldal (lábléc)
    for (const mar of ["Fizetés", "Szállítás", "Képes vásárlói tájékoztató"])
      expect(cimkek).not.toContain(mar)
    expect(cimkek).toContain("Általános szerződési feltételek")
    expect(cimkek).toContain("Adatkezelési tájékoztató")
    // az Elerhetosegek mar sajat oldal
    expect(cimkek).not.toContain("Elérhetőségek")
    expect(torzs.count).toBe(torzs.links.length)
  })

  it("bekapcsolt Fogyasztóbarátnál az ASZF és az adatkezelés kiesik a listából", async () => {
    process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED = "true"
    const cimkek = (
      await (await kerek("?host=shop.acropora.hu")).json()
    ).links.map((l: { cimke: string }) => l.cimke)
    expect(cimkek).not.toContain("Általános szerződési feltételek")
    expect(cimkek).toContain("Kedvenceim")
  })

  it("a teszt kirakat hosztjára nincs link: ok és nulla", async () => {
    const torzs = await (await kerek("?host=shop-staging.acropora.hu")).json()
    expect(torzs).toMatchObject({ status: "ok", count: 0, links: [] })
  })

  it("paraméter nélkül a szerver saját hosztját kérdezi", async () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://shop.acropora.hu"
    const torzs = await (await kerek()).json()
    expect(torzs.host).toBe("shop.acropora.hu")
    expect(torzs.status).toBe("old_shop_links_remain")
  })

  it("érvénytelen host: 400", async () => {
    for (const host of ["", "a b", "x/y", "//evil", "a@b"]) {
      const valasz = await kerek(`?host=${encodeURIComponent(host)}`)
      expect(valasz.status).toBe(400)
    }
  })
})
