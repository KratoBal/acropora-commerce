import { describe, expect, it } from "vitest"

import { JOGI_DOKUMENTUMOK, jogiOldal } from "@lib/util/fogyasztobarat"
import type {
  KezdolapLablec,
  KezdolapTartalom,
} from "@modules/kezdolap/tartalom"
import { OSZLOP_SORREND } from "./hivatkozasok"
import { lablecAdat } from "./lablec-adat"

/*
  A SZERKESZTHETO LABLEC. MI PIROSIT: ha szerkesztes nelkul a lablec NEM a mai
  (oszlopok, ceg-adatok, also sor); ha a jogi dokumentumok (ASZF, adatkezeles)
  kimaradnak a szerkesztett lablecbol, akar az OS oszlopa nelkul, akar az
  "Informaciok" oszlop nevenek barmilyen irasmodjaval; ha egy veszelyes cim
  (javascript:, //host) link marad; ha a bemutatkozas nyers HTML; ha a kitalalt
  kezdoertek-cim kiszorit egy valodi ceg-cimet; ha egy serult rekord reszben
  ervenyesul; ha az A boltunk szovegei ujra a lablec adataba kerulnek (a ceges
  oszlop 2026-10-27 ota fix, kirakat-lablec-kep).
*/
const lablec = (felulir: Partial<KezdolapLablec> = {}): KezdolapLablec => ({
  intro: "<p>Tengeri <strong>akvarisztika</strong></p>",
  columns: [
    {
      title: "Oldaltérkép",
      links: [
        { label: "Nyitóoldal", href: "/" },
        { label: "Blog", href: "https://acropora.hu/blog" },
      ],
    },
  ],
  social: {
    facebook: "https://www.facebook.com/acropora",
    instagram: null,
    youtube: null,
  },
  bottom_text: "© Acropora Kft.",
  ...felulir,
})
const rekord = (
  footer: KezdolapTartalom["footer"],
  texts: Record<string, string> = {},
): KezdolapTartalom => ({ texts, slides: null, footer })

const JOGI = JOGI_DOKUMENTUMOK.map((d) => jogiOldal(d.slug))
const hrefek = (a: ReturnType<typeof lablecAdat>) =>
  a.oszlopok.flatMap((o) => o.linkek.map((l) => l.href))

describe("a lábléc adata", () => {
  it("szerkesztés nélkül (nincs rekord, nincs footer, null) a mai lábléc", () => {
    for (const t of [null, rekord(undefined), rekord(null)]) {
      const a = lablecAdat(t)
      expect(a.oszlopok.map((o) => o.azonosito)).toEqual(
        expect.arrayContaining([...OSZLOP_SORREND]),
      )
      expect(a.bemutatkozo).toBeNull()
      expect(a.alsoSor).toBeNull()
      expect(a.kozossegi).toEqual([])
      for (const j of JOGI) expect(hrefek(a)).toContain(j)
    }
  })

  it("szerkesztve az OS oszlopai állnak, a jogi dokumentumokkal együtt", () => {
    const a = lablecAdat(rekord(lablec()))
    expect(a.oszlopok.map((o) => o.cim)).toEqual(["Oldaltérkép", "Információk"])
    expect(a.oszlopok[0]!.linkek.map((l) => l.href)).toEqual([
      "/",
      "https://acropora.hu/blog",
    ])
    expect(a.oszlopok[0]!.linkek.map((l) => l.sajat)).toEqual([true, false])
    for (const j of JOGI) expect(hrefek(a)).toContain(j)
  })

  it("az OS Információk oszlopa megkapja a jogi linkeket, egyszer, a hivatalos felirattal", () => {
    for (const cim of ["Információk", "informaciok", "INFORMÁCIÓK"]) {
      const a = lablecAdat(
        rekord(
          lablec({
            columns: [
              {
                title: cim,
                links: [
                  { label: "Szállítás", href: "/shipping" },
                  // ugyanarra a jogi cimre mutat mas felirattal: kiesik, nem fedi el a hivatalosat
                  { label: "ASZF másolat", href: jogiOldal("aszf") },
                  { label: "Blog", href: jogiOldal("adatkezeles") },
                ],
              },
            ],
          }),
        ),
      )
      expect(a.oszlopok).toHaveLength(1)
      const h = hrefek(a)
      for (const j of JOGI) expect(h.filter((x) => x === j)).toHaveLength(1)
      expect(h).toContain("/shipping")
      const cimkek = a.oszlopok[0]!.linkek.map((l) => l.cimke)
      for (const d of JOGI_DOKUMENTUMOK) expect(cimkek).toContain(d.cim)
      expect(cimkek).not.toContain("ASZF másolat")
      expect(cimkek).not.toContain("Blog")
    }
  })

  it("a cím és hivatkozás nélküli oszlop nem látszik, a cím nélküli, de linkes igen (az OS ezt engedi)", () => {
    const a = lablecAdat(
      rekord(
        lablec({
          columns: [
            { title: "", links: [] },
            { title: "", links: [{ label: "Blog", href: "/blog" }] },
            { title: "Üres", links: [] },
          ],
        }),
      ),
    )
    expect(a.oszlopok.map((o) => [o.cim, o.linkek.length > 0])).toEqual([
      ["", true],
      ["Üres", false],
      ["Információk", true],
    ])
  })

  it("oszlop nélküli rekordnál is ott a jogi oszlop", () => {
    const a = lablecAdat(rekord(lablec({ columns: [] })))
    expect(a.oszlopok).toHaveLength(1)
    for (const j of JOGI) expect(hrefek(a)).toContain(j)
  })

  it("veszélyes cím nem marad link, a közösségi csak teljes http(s)", () => {
    const a = lablecAdat(
      rekord(
        lablec({
          columns: [
            {
              title: "T",
              links: [
                { label: "rossz1", href: "javascript:alert(1)" },
                { label: "rossz2", href: "//evil.example" },
                { label: "rossz3", href: "data:text/html,x" },
                { label: "jó", href: "/store" },
              ],
            },
          ],
          social: {
            facebook: "javascript:alert(1)",
            instagram: "/instagram",
            youtube: "https://www.youtube.com/@acropora",
          },
        }),
      ),
    )
    expect(a.oszlopok[0]!.linkek.map((l) => l.cimke)).toEqual(["jó"])
    expect(a.kozossegi).toEqual([
      { nev: "YouTube", href: "https://www.youtube.com/@acropora" },
    ])
  })

  it("a bemutatkozás tisztítva érkezik, az üres bemutatkozás nincs", () => {
    const a = lablecAdat(
      rekord(lablec({ intro: '<p onclick="x()">jó</p><script>x()</script>' })),
    )
    expect(a.bemutatkozo).toBe("<p>jó</p>")
    expect(lablecAdat(rekord(lablec({ intro: "" }))).bemutatkozo).toBeNull()
    expect(
      lablecAdat(rekord(lablec({ intro: "<script>x</script>" }))).bemutatkozo,
    ).toBeNull()
  })

  it("az alsó sor az OS-é, ha van", () => {
    expect(lablecAdat(rekord(lablec())).alsoSor).toBe("© Acropora Kft.")
    expect(lablecAdat(rekord(lablec({ bottom_text: "  " }))).alsoSor).toBeNull()
  })

  it("az A boltunk szövegei nem kerülnek a lábléc adatába: a céges oszlop fix", () => {
    const a = lablecAdat(
      rekord(lablec(), {
        "bolt.cim_ertek": "9999 Kitalált, Példa utca 1",
        "bolt.nyitva_ertek": "Mindig nyitva",
      }),
    )
    expect(JSON.stringify(a)).not.toContain("Kitalált")
    expect(JSON.stringify(a)).not.toContain("Mindig nyitva")
    // pozitív kontroll: ugyanaz a rekord a szerkesztett oszlopokat hozza
    expect(a.oszlopok.map((o) => o.cim)).toContain("Oldaltérkép")
  })

  it("serült rekord (hiányzó mező, rossz típus) a mai lábléc, nem félig érvényes", () => {
    const serult: unknown[] = [
      { ...lablec(), columns: "nem lista" },
      { ...lablec(), social: null },
      { ...lablec(), intro: 5 },
      { ...lablec(), columns: [{ title: "T", links: [{ label: "x" }] }] },
      "szöveg",
    ]
    for (const footer of serult) {
      const a = lablecAdat(rekord(footer as KezdolapLablec))
      expect(a.bemutatkozo).toBeNull()
      expect(a.oszlopok.map((o) => o.azonosito)).toEqual(
        expect.arrayContaining([...OSZLOP_SORREND]),
      )
    }
  })
})
