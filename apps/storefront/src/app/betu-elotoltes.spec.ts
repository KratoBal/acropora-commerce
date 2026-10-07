// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A BETU-ELOTOLTES (FE-7). A `next/font` alapbol minden lapon elotolti a
 * betut. A Newsreader ket fajlja 416 KB, es ma csak a kosarban all.
 *
 * A layoutot a stilus-importjai miatt a teszt nem tudja betolteni, ezert a
 * KODJAT olvassa, a kommentek nelkul (egy kommentben allo `preload: false` ne
 * szamitson), ugyanugy, mint a `styles/betu-lancok.spec.ts`.
 *
 * MI PIROSIT: ha a Newsreader ujra elotoltodne; ha egy fo betu (a fejlec es
 * a torzs betuje) elvesztene az elotoltest.
 */
const kod = readFileSync(join(__dirname, "layout.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")

/** Egy `localFont({...})` hivas szovege a valtozo-neve alapjan. */
function betuHivas(valtozo: string): string {
  const hivasok = kod.split(/localFont\(/).slice(1)
  const talalat = hivasok.find((h) => h.includes(`variable: "${valtozo}"`))
  if (!talalat) throw new Error(`nincs localFont hivas ezzel: ${valtozo}`)
  return talalat
}

describe("a kirakat betűinek előtöltése", () => {
  it("a Newsreadert nem tölti elő", () => {
    expect(betuHivas("--terv-betu-kiemelt")).toMatch(/preload:\s*false/)
  })

  it("a fő betűket (törzs és fejléc) előtölti", () => {
    for (const fo of ["--terv-betu-fo", "--acr-font-hanken"])
      expect(betuHivas(fo), fo).not.toMatch(/preload:\s*false/)
  })
})
