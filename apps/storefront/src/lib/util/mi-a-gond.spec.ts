import { describe, expect, it } from "vitest"

import {
  MIAGOND_BEVEZETO,
  MIAGOND_CIM,
  MIAGOND_FIGYELMEZTETES,
  szovegDarabok,
  TUNET_OLDALAK,
  tunetKezelok,
  tunetOldal,
  type TunetOldal,
} from "./mi-a-gond"

/**
 * "MI A GOND A MEDENCEDDEL?" (V4.3). MI PIROSIT: egy nyitott jeloles (KITOLTENDO, EL, KEP KELL), forras-cimke (KOZISMERET,
 * BOLTI), belso hivatkozas (polip, fajlnev, datum) az oldal szovegeben; egy mondat, amit az EL jeloles kerdezett es kimaradt, de
 * visszakerult; egy tunet-oldal, amelyiknek nincs ertemi tartalma; ket oldal ugyanazon a cimen; gondolatjel; az "N. oldal"
 * hivatkozas, ami nem letezo oldalra linkelne, vagy a szoveget megvaltoztatja.
 */
const mind = (o: TunetOldal): string[] => [
  o.cim,
  ...o.kinez,
  ...o.lasdMeg,
  ...o.merd,
  ...o.okok,
  ...o.teendok,
  ...o.nene,
  ...o.segitseg,
  o.termekek.egyebEszkoz,
  ...o.termekek.ovatossag,
  o.termekek.bevezeto ?? "",
  ...o.termekek.kezelok.map((k) => k.megjegyzes),
  ...o.termekek.utolso,
]
const szoveg = TUNET_OLDALAK.flatMap(mind).join("\n")

describe("a tunet-oldalak szovege", () => {
  it("MG-OLDALAK: tiz oldal 1-10 sorszammal, egyedi cimmel es kezelovel, mindegyiknek van ertemi tartalma", () => {
    expect(TUNET_OLDALAK.map((o) => o.szam)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(new Set(TUNET_OLDALAK.map((o) => o.slug)).size).toBe(10)
    expect(new Set(TUNET_OLDALAK.map((o) => o.cim)).size).toBe(10)
    for (const o of TUNET_OLDALAK) {
      expect(o.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(o.kinez.length, o.slug).toBeGreaterThan(0)
      expect(o.merd.length, o.slug).toBeGreaterThan(0)
      expect(o.teendok.length, o.slug).toBeGreaterThan(0)
      expect(o.nene.length, o.slug).toBeGreaterThan(0)
      expect(o.segitseg.length, o.slug).toBeGreaterThan(0)
    }
  })

  it("MG-NYITOTT: nyitott jeloles, forras-cimke es belso hivatkozas nincs a szovegben", () => {
    for (const tiltott of [
      "KITÖLTENDŐ",
      "KÉP KELL",
      "[EL",
      "EL:",
      "KÖZISMERET",
      "BOLTI",
      "polip",
      "agents/",
      "v33-",
      "2026-11-04",
      "(KÖZISMERET",
      "V4.3",
      "V3.3",
      "[",
      "]",
      "*",
    ]) {
      expect(szoveg, tiltott).not.toContain(tiltott)
    }
  })

  it("MG-GONDOLATJEL: nincs gondolatjel (em dash) vagy dupla kotojel", () => {
    expect(szoveg).not.toContain("—")
    expect(szoveg).not.toContain(" -- ")
  })

  // acrobot 51912: ahol az EL jeloles a mondat jovahagyasat kerdezte, a mondat kimarad. Ezek a kimaradt mondatok.
  it("MG-KIMARADT: az EL-lel jelolt, jovahagyatlan mondatok nincsenek az oldalakon", () => {
    for (const kimaradt of [
      "Az UV nem minden dinó-típusnál működik",
      "ezek algaölő szerek, és a kezelés mérgező anyagot szabadíthat fel",
      "Az alacsony tápanyag is halványíthat",
      "több ilyen termék leírása a zooxanthellák számának csökkentéséről beszél",
      "A kezelést szakember tanácsával, és a legtöbb esetben külön tartályban",
      "A gyártó például azt írja, hogy a BIODiversity",
      "a pH természetesen ingadozik napközben",
      "told vissza a mérhető tartományba",
      "a dinoflagellata gyakran akkor erősödik",
      "Mithrax",
      "Blue Life Flux",
      "Polyplab Reef Safe Medic",
    ]) {
      expect(szoveg, kimaradt).not.toContain(kimaradt)
    }
  })

  it("MG-KERESZT: az N. oldal hivatkozas csak letezo oldalra linkel, es a szoveget nem valtoztatja meg", () => {
    const sor =
      "ha nyúlós, az a 3. oldal (dinoflagellata gyanú). A 99. oldal nincs."
    const darabok = szovegDarabok(sor, new Set([3]))
    expect(darabok.map((d) => d.szoveg).join("")).toBe(sor)
    expect(darabok.filter((d) => "szam" in d)).toEqual([
      { szam: 3, szoveg: "3. oldal (dinoflagellata gyanú)" },
    ])
    expect(szovegDarabok("semmi hivatkozas", new Set([1]))).toEqual([
      { szoveg: "semmi hivatkozas" },
    ])
    for (const o of TUNET_OLDALAK)
      for (const s of mind(o)) {
        const d = szovegDarabok(s, new Set(TUNET_OLDALAK.map((x) => x.szam)))
        expect(d.map((x) => x.szoveg).join("")).toBe(s)
      }
  })

  it("MG-TERMEKEK: a kezelok szabalyosak, termekenkent egy bolti allitassal (a kalium-karbonat oldal kivetelevel), oldalankent egyediek", () => {
    for (const o of TUNET_OLDALAK) {
      const kezelok = tunetKezelok(o)
      expect(new Set(kezelok).size, o.slug).toBe(kezelok.length)
      for (const t of [
        ...o.termekek.meroeszkozok,
        ...o.termekek.kezelok.flatMap((k) => k.termekek),
      ]) {
        expect(t.sku.trim()).not.toBe("")
        expect(t.handle).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      }
      if (o.szam !== 9)
        for (const k of o.termekek.kezelok)
          expect(k.megjegyzes.trim(), o.slug).not.toBe("")
    }
  })

  it("MG-BELEPO: a belepo cime, bevezetoje es a figyelmeztetes megvan, a figyelmeztetes Korall mondata", () => {
    expect(MIAGOND_CIM).toBe("Mi a gond a medencéddel?")
    expect(MIAGOND_BEVEZETO.length).toBeGreaterThan(20)
    expect(MIAGOND_FIGYELMEZTETES).toBe(
      "Ez általános útmutató, nem helyettesíti a medence mérését és szakember tanácsát.",
    )
    expect(tunetOldal("cianobakterium")?.szam).toBe(2)
    expect(tunetOldal("nincs-ilyen")).toBeUndefined()
  })
})
