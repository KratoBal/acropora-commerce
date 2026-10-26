import { describe, expect, it } from "vitest"

import fixtura from "./__fixtures__/homepage-content-record.fixture.json"
import { ervenyesRekord } from "./kezdolap-rekord"

/*
  A REKORD ELLENORZESE, A KOZOS FIXTURAVAL. A fixtura nautilus fajlja
  (agents/nautilus/atadas/kezdolap-2026-10-26/homepage-content-record.fixture.json,
  sha256 721fb621...), a backend specje ugyanazokat a rontasokat futtatja.
  MI PIROSIT: ha a kozos fixtura nem megy at; ha egy rontas (hianyzo/ismetlodo
  blokk, ismeretlen kulcs, `contact` a lableceben, veszelyes link, hosszkorlat,
  extra mezo) elfogadasra kerul; ha egy korabbi rekord (blocks/footer nelkul)
  hirtelen elbukik.
*/
const jo = () => structuredClone(fixtura) as Record<string, unknown>
const ok = (x: unknown) => ervenyesRekord(x).ok
/* a rontasok szabadon irnak a rekordba (hianyzo, extra, rossz tipusu mezo): ezert laza tipus */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Laza = Record<string, any>
const modosit = (f: (r: Laza) => void) => {
  const r = jo() as Laza
  f(r)
  return r
}

describe("a kezdőlap-rekord ellenőrzése", () => {
  it("a közös fixtúra érvényes, a blocks és a footer nélküli régi rekord is", () => {
    expect(ok(jo())).toBe(true)
    const regi = modosit((r) => {
      delete r.blocks
      delete r.footer
    })
    expect(ok(regi)).toBe(true)
    expect(ok(modosit((r) => (r.blocks = null)))).toBe(true)
    expect(ok(modosit((r) => (r.footer = null)))).toBe(true)
  })

  it("a blokk-lista: nyolc fix blokk egyszer, sem hiányzó, sem ismétlődő, sem ismeretlen", () => {
    expect(ok(modosit((r) => r.blocks.pop()))).toBe(false)
    expect(ok(modosit((r) => (r.blocks[1] = { ...r.blocks[0] })))).toBe(false)
    expect(
      ok(modosit((r) => r.blocks.push({ key: "hero", visible: true }))),
    ).toBe(false)
    expect(
      ok(modosit((r) => (r.blocks[7] = { key: "sajat-x", visible: true }))),
    ).toBe(false)
    expect(ok(modosit((r) => (r.blocks[0].visible = "true")))).toBe(false)
    expect(ok(modosit((r) => (r.blocks[0].body = "<p>x</p>")))).toBe(false)
  })

  it("a lábléc: korlátok, ismeretlen kulcs (contact), veszélyes cím", () => {
    expect(ok(modosit((r) => (r.footer.contact = { address: "x" })))).toBe(
      false,
    )
    expect(ok(modosit((r) => delete r.footer.social))).toBe(false)
    // ugyanaz a határ, mint a backend specjében (#567): 4001 és 8000 még jó, 8001 nem
    expect(ok(modosit((r) => (r.footer.intro = "x".repeat(4001))))).toBe(true)
    expect(ok(modosit((r) => (r.footer.intro = "x".repeat(8000))))).toBe(true)
    expect(ok(modosit((r) => (r.footer.intro = "x".repeat(8001))))).toBe(false)
    expect(ok(modosit((r) => (r.footer.bottom_text = "x".repeat(301))))).toBe(
      false,
    )
    expect(
      ok(
        modosit((r) => {
          r.footer.columns = Array.from({ length: 5 }, () => ({
            title: "T",
            links: [],
          }))
        }),
      ),
    ).toBe(false)
    expect(
      ok(
        modosit((r) => {
          r.footer.columns[0].links = Array.from({ length: 13 }, (_, i) => ({
            label: `L${i}`,
            href: "/x",
          }))
        }),
      ),
    ).toBe(false)
    for (const rossz of [
      "javascript:alert(1)",
      "data:text/html,x",
      "//evil.example",
      "mailto:a@b.hu",
      "https://a b.hu",
    ])
      expect({
        rossz,
        ok: ok(modosit((r) => (r.footer.columns[0].links[0].href = rossz))),
      }).toEqual({
        rossz,
        ok: false,
      })
    for (const rossz of ["/facebook", "javascript:alert(1)", "facebook.com/x"])
      expect({
        rossz,
        ok: ok(modosit((r) => (r.footer.social.facebook = rossz))),
      }).toEqual({
        rossz,
        ok: false,
      })
    // az üres oszlopcím az OS szabálya szerint érvényes, a túl hosszú nem
    expect(ok(modosit((r) => (r.footer.columns[0].title = "")))).toBe(true)
    expect(
      ok(modosit((r) => (r.footer.columns[0].title = "x".repeat(101)))),
    ).toBe(false)
  })

  it("a többi kulcs: ismeretlen kulcs, slides kötelező, szöveg-kulcs és -hossz, handle-ek", () => {
    expect(ok(modosit((r) => (r.valami = 1)))).toBe(false)
    expect(ok(modosit((r) => delete r.slides))).toBe(false)
    expect(ok(modosit((r) => (r.texts["Rossz Kulcs"] = "x")))).toBe(false)
    expect(ok(modosit((r) => (r.texts["mit.cim"] = "x".repeat(2001))))).toBe(
      false,
    )
    expect(ok(modosit((r) => (r.featured_handles = ["a", "a"])))).toBe(false)
    expect(ok(modosit((r) => (r.featured_handles = ["../x"])))).toBe(false)
    expect(
      ok(
        modosit(
          (r) =>
            (r.featured_handles = Array.from(
              { length: 13 },
              (_, i) => `k-${i}`,
            )),
        ),
      ),
    ).toBe(false)
    for (const nem of [null, undefined, "szöveg", 5, []])
      expect(ok(nem)).toBe(false)
  })

  it("a szerver-jelölő (tisztitott) az OS rekordjában ismeretlen kulcs: elutasítva", () => {
    expect(ok(modosit((r) => (r.tisztitott = true)))).toBe(false)
  })

  it("az első hibát megnevezi", () => {
    const eredmeny = ervenyesRekord(modosit((r) => (r.footer.contact = {})))
    expect(eredmeny.ok).toBe(false)
    if (!eredmeny.ok) expect(eredmeny.hiba).toContain("footer")
  })
})
