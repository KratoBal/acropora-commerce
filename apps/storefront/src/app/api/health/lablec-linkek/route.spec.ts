import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ tartalom: vi.fn() }))
vi.mock("@lib/data/kezdolap-tartalom", () => ({
  kezdolapTartalom: adat.tartalom,
}))

import { GET } from "./route"

/** A teszt OS rekordja 2026-11-19 reggelen: a lablec ot linket vitt a regi boltba. */
const REGI_REKORD = {
  texts: {},
  footer: {
    intro: "",
    bottom_text: "",
    social: { facebook: null, instagram: null, youtube: null },
    columns: [
      {
        title: "Oldaltérkép",
        links: [{ label: "Nyitóoldal", href: "/" }],
      },
      {
        title: "Vásárlói fiók",
        links: [
          {
            label: "Kedvenceim",
            href: "https://shop.acropora.hu/shop_order_track.php?tab=favourite",
          },
        ],
      },
      {
        title: "Információk",
        links: [
          {
            label: "Fizetés",
            href: "https://shop.acropora.hu/shop_contact.php?tab=payment",
          },
          {
            label: "Szállítás",
            href: "https://shop.acropora.hu/shop_contact.php?tab=shipping",
          },
          {
            label: "Elérhetőségek",
            href: "https://shop.acropora.hu/shop_contact.php",
          },
          {
            label: "Képes vásárlói tájékoztató",
            href: "https://shop.acropora.hu/fogyaszto-barat",
          },
        ],
      },
    ],
  },
}

beforeEach(() => {
  adat.tartalom.mockReset()
  // alapból az OS nem írt lábléc-rekordot: a lap saját lába áll
  adat.tartalom.mockResolvedValue(null)
})

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
 * regi-boltnak szamolna; ha a kapu csak a kod listajat olvasna, az OS rekordjat
 * nem (a teszt OS rekordja ot linket vitt a regi boltba, a kapu nullat mondott);
 * ha egy olvashatatlan rekord "nulla" lenne; ha egy masik hosztra mutato kulso
 * link (pl. a kozossegi) regi-boltnak szamitana.
 */
describe("GET /api/health/lablec-linkek", () => {
  it("az átállás előtt megkérdezhető: a regi bolt hosztjára már csak a két jogi dokumentum mutat", async () => {
    const torzs = await (await kerek("?host=shop.acropora.hu")).json()
    expect(torzs.status).toBe("old_shop_links_remain")
    const cimkek = torzs.links.map((l: { cimke: string }) => l.cimke)
    // a Kedvenceim 2026-11-09 óta nincs a láblécben (d707cf5f)
    expect(cimkek).not.toContain("Kedvenceim")
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
    // a Kedvenceim kikerülése óta ilyenkor egy régi-bolti link sem marad
    expect(cimkek).toEqual([])
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

  it("az OS rekordjának régi-bolti linkjeit is megszámolja (a kód listája egyedül nullát mondott)", async () => {
    adat.tartalom.mockResolvedValue(REGI_REKORD)
    const torzs = await (await kerek("?host=shop.acropora.hu")).json()
    const cimkek = torzs.links.map((l: { cimke: string }) => l.cimke)
    for (const regi of [
      "Kedvenceim",
      "Fizetés",
      "Szállítás",
      "Elérhetőségek",
      "Képes vásárlói tájékoztató",
    ])
      expect(cimkek).toContain(regi)
    expect(torzs.status).toBe("old_shop_links_remain")
    // a két jogi dokumentum a kód listájából, a rekord linkjeivel együtt
    expect(torzs.count).toBe(7)
  })

  it("a rekord nélküli lábléc (footer: null) ugyanazt adja, mint a kód listája", async () => {
    adat.tartalom.mockResolvedValue({ texts: {}, footer: null })
    const rekordNelkul = await (await kerek("?host=shop.acropora.hu")).json()
    adat.tartalom.mockResolvedValue(null)
    const nincsTartalom = await (await kerek("?host=shop.acropora.hu")).json()
    expect(rekordNelkul).toEqual(nincsTartalom)
    expect(rekordNelkul.count).toBe(2)
  })

  it("a rekord más hosztra mutató kulső linkje nem régi-bolti", async () => {
    adat.tartalom.mockResolvedValue({
      texts: {},
      footer: {
        ...REGI_REKORD.footer,
        columns: [
          {
            title: "Információk",
            links: [{ label: "Blog", href: "https://blog.example.test/" }],
          },
        ],
      },
    })
    process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED = "true"
    const torzs = await (await kerek("?host=shop.acropora.hu")).json()
    expect(torzs).toMatchObject({ status: "ok", count: 0, links: [] })
  })

  it("az olvashatatlan rekord 503 és ismeretlen, nem nulla", async () => {
    adat.tartalom.mockRejectedValue(new Error("ECONNREFUSED"))
    const valasz = await kerek("?host=shop.acropora.hu")
    expect(valasz.status).toBe(503)
    expect(await valasz.json()).toEqual({ status: "unknown" })
  })

  it("a teszt kirakat hosztjára a régi rekord sem ad linket (a link a régi bolt hosztjára mutat)", async () => {
    adat.tartalom.mockResolvedValue(REGI_REKORD)
    const torzs = await (await kerek("?host=shop-staging.acropora.hu")).json()
    expect(torzs).toMatchObject({ status: "ok", count: 0 })
  })

  it("ugyanaz a link a rekordban és a kód listájában egyszer számít", async () => {
    adat.tartalom.mockResolvedValue({
      texts: {},
      footer: {
        ...REGI_REKORD.footer,
        columns: [
          {
            title: "Információk",
            links: [
              {
                label: "Általános szerződési feltételek",
                href: "https://shop.acropora.hu/shop_help.php?tab=terms",
              },
            ],
          },
        ],
      },
    })
    const torzs = await (await kerek("?host=shop.acropora.hu")).json()
    expect(torzs.count).toBe(2)
  })
})
