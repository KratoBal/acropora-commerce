import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { generikusAlt } from "./generikus-alt"

/**
 * EGY `<main>` A LAPON (SEO frontend FE-1).
 *
 * A gyoker elrendezes (`app/layout.tsx`) mar `<main>`-be teszi az oldalt. Merve a
 * teszt kirakaton 2026-10-07: a kategorialapon ket `<main>` allt, mert a sablon
 * maga is nyitott egyet. A kereso es a felolvaso igy ket fo tartalmat lat.
 *
 * MI PIROSIT: ha a gyokeren kivul barmelyik forrasfajl `<main>` elemet nyit.
 */
function forrasFajlok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) talalt.push(...forrasFajlok(ut))
    else talalt.push(ut)
  }
  return talalt
}

describe("egy <main> a lapon", () => {
  it("csak a gyökér elrendezés nyit <main>-t", () => {
    const src = join(__dirname, "..", "..")
    const nyitok: string[] = []
    for (const ut of forrasFajlok(src)) {
      if (!ut.endsWith(".tsx") || ut.includes(".spec.")) continue
      if (/<main[\s>]/.test(readFileSync(ut, "utf8")))
        nyitok.push(relative(src, ut))
    }
    expect(nyitok).toEqual(["app/layout.tsx"])
  })
})

/**
 * NINCS GENERIKUS ALT A FORRASBAN (Balazs 2026-10-07, 5. pont; barracuda
 * atvetele, #519: a `thumbnail` `alt="Thumbnail"`-je es a galeria
 * `alt="Termékfotó"`-ja maradt).
 *
 * MI PIROSIT: barmelyik `.tsx` egy allando, generikus `alt` szoveggel.
 */
describe("nincs generikus alt a forrásban", () => {
  it("egyetlen állandó alt sem generikus", () => {
    const src = join(__dirname, "..", "..")
    const talalatok: string[] = []
    let altok = 0
    for (const ut of forrasFajlok(src)) {
      if (!ut.endsWith(".tsx") || ut.includes(".spec.")) continue
      for (const m of Array.from(
        readFileSync(ut, "utf8").matchAll(/\balt=(?:"([^"]*)"|\{"([^"]*)"\})/g),
      )) {
        altok += 1
        const alt = m[1] ?? m[2] ?? ""
        if (generikusAlt(alt))
          talalatok.push(`${relative(src, ut)}: alt="${alt}"`)
      }
    }
    // ismert pozitiv kontroll: a kereso tenyleg latott allando alt-okat
    expect(altok).toBeGreaterThan(5)
    expect(talalatok).toEqual([])
  })

  it("a lista a két tiltott szót és a valódi nevet is helyesen kezeli", () => {
    expect(generikusAlt("Thumbnail")).toBe(true)
    expect(generikusAlt("Termékfotó")).toBe(true)
    expect(generikusAlt("Product image 2")).toBe(true)
    expect(generikusAlt("IMG_2041.jpg")).toBe(true)
    expect(generikusAlt("Vitalis LPS Coral Pellets")).toBe(false)
    expect(generikusAlt("")).toBe(false)
  })
})
