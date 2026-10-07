import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

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
