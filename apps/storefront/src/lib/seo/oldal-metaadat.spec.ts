import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ANGOL_HELYKITOLTOK,
  kategoriaLeiras,
  keresesMetaadat,
  kezdolapLeiras,
  lapCim,
  LEIRAS_MAX,
  leirasSzovegbol,
  markaLeiras,
  openGraph,
  termekLeiras,
} from "./oldal-metaadat"

/**
 * AZ OLDALAK METAADATA (SEO frontend FE-1, a CI SEO-tesztek elso darabjai,
 * Balazs 15. pontja szerint: title, meta description, nincs angol helykitolto).
 *
 * MI PIROSIT: ha a termeklap leirasa a cim masolata; ha egy lap leirasa ures;
 * ha angol helykitolto ter vissza (egy uj lapon is: a forras-ellenorzes minden
 * lapot atnez).
 */
const angol = (szoveg: string) => ANGOL_HELYKITOLTOK.some((m) => m.test(szoveg))

describe("rövid leírás HTML-ből", () => {
  it("a jelölést és a felesleges szóközt eldobja", () => {
    expect(leirasSzovegbol("<p>Erős   <b>LED</b>&nbsp;lámpa</p>")).toBe(
      "Erős LED lámpa",
    )
  })

  it("üres szövegre null, hogy a következő forrás jöhessen", () => {
    expect(leirasSzovegbol("<p>  </p>")).toBeNull()
    expect(leirasSzovegbol(null)).toBeNull()
  })

  it("hosszú szöveget szóhatáron vág, a határon belül", () => {
    const hosszu = "szó ".repeat(80)
    const vagott = leirasSzovegbol(hosszu)!
    expect(vagott.length).toBeLessThanOrEqual(LEIRAS_MAX)
    expect(vagott.endsWith("…")).toBe(true)
    expect(vagott).not.toMatch(/sz…$/)
  })
})

describe("a terméklap leírása", () => {
  const termek = {
    title: "Hanna HI780-25 pH reagens",
    description: "<p>A teljes leírás első mondata.</p>",
    metadata: { unas_short_description: "<p>Rövid leírás a listából.</p>" },
  }

  it("a rövid leírásból jön, ha van", () => {
    expect(termekLeiras(termek)).toBe("Rövid leírás a listából.")
  })

  it("rövid leírás nélkül a leírás eleje", () => {
    expect(termekLeiras({ ...termek, metadata: {} })).toBe(
      "A teljes leírás első mondata.",
    )
  })

  it("semmi nélkül egy magyar mondat, és sosem a cím másolata", () => {
    const leiras = termekLeiras({ title: termek.title, metadata: null })
    expect(leiras).not.toBe(termek.title)
    expect(leiras).toContain(termek.title)
    expect(angol(leiras)).toBe(false)
  })
})

describe("a többi oldaltípus", () => {
  it("kezdőlap, kategória és márka: nem üres, magyar leírás", () => {
    for (const leiras of [
      kezdolapLeiras(),
      kategoriaLeiras("Szivattyúk"),
      kategoriaLeiras("Szivattyúk", ""),
      markaLeiras("Boyu"),
    ]) {
      expect(leiras.length).toBeGreaterThan(10)
      expect(angol(leiras)).toBe(false)
    }
  })

  it("a saját leírás elsőbbséget kap", () => {
    expect(kategoriaLeiras("Szivattyúk", "<p>Áramoltatók.</p>")).toBe(
      "Áramoltatók.",
    )
  })

  it("keresés: a kifejezés a címben, anélkül az összes termék", () => {
    expect(keresesMetaadat(" hanna ").cim).toBe(lapCim("Keresés: hanna"))
    expect(keresesMetaadat(null).cim).toBe(lapCim("Összes termék"))
    expect(angol(keresesMetaadat(null).leiras)).toBe(false)
  })

  it("OpenGraph: magyar nyelv, bolt neve, a kanonikus cím, ha van", () => {
    expect(
      openGraph({ cim: "C", leiras: "L", url: "/hu/products/x" }),
    ).toMatchObject({
      locale: "hu_HU",
      siteName: expect.any(String),
      type: "website",
      url: "/hu/products/x",
    })
    expect(openGraph({ cim: "C", leiras: "L" })).not.toHaveProperty("url")
  })
})

/**
 * MINDEN LAP STATIKUS CIME ES LEIRASA, A FORRASBOL. Egy uj lap, ami a starter
 * angol helykitoltojevel jon, itt pirosra valt, akkor is, ha a fenti
 * fuggvenyeket meg sem hivja.
 */
describe("egyetlen lap sem ad angol helykitöltőt", () => {
  it("a lapok `title` és `description` szövegei", async () => {
    const gyoker = join(__dirname, "..", "..", "app")
    const talalatok: string[] = []
    let lapok = 0
    for await (const fajl of glob("**/{page,layout,not-found}.tsx", {
      cwd: gyoker,
    })) {
      lapok += 1
      const forras = readFileSync(join(gyoker, fajl), "utf8")
      for (const m of forras.matchAll(
        /\b(title|description):\s*["`]([^"`]+)["`]/g,
      ))
        if (angol(m[2]!)) talalatok.push(`${fajl}: ${m[1]} = ${m[2]}`)
    }
    // ismert pozitiv kontroll: a kereso tenyleg lapokat latott
    expect(lapok).toBeGreaterThan(20)
    expect(talalatok).toEqual([])
  })
})
