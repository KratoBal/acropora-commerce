// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A BETU-ELOTOLTES (FE-7, majd commerce-audit-p0 T1). A `next/font` alapbol
 * minden lapon elotolti a betut. A Newsreader normal fajlja (196 KB) 2026-10-27
 * ota ELOTOLTODIK: a kezdolap hero H1-je es a savcimek ezt viselik, es a mobil
 * LCP-elem maga a H1 (Lighthouse: 2160 ms kirajzolasi kesleltetes). A DOLT fajl
 * (220 KB) nem: az csak a velemenyek idezetein all, a kezdolap aljan, es a
 * `preload` hivasonkent, nem fajlonkent all, ezert kulon `localFont` hivas.
 *
 * A layoutot a stilus-importjai miatt a teszt nem tudja betolteni, ezert a
 * KODJAT olvassa, a kommentek nelkul (egy kommentben allo `preload: false` ne
 * szamitson), ugyanugy, mint a `styles/betu-lancok.spec.ts`.
 *
 * MI PIROSIT: ha a normal Newsreader elvesztene az elotoltest; ha a dolt
 * ujra elotoltodne, vagy egy hivasban allna a normallal (a `src`-tombbol minden
 * fajl elotoltodne); ha egy fo betu (a fejlec es a torzs betuje) elvesztene az
 * elotoltest.
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
  it("a normál Newsreadert előtölti", () => {
    const hivas = betuHivas("--terv-betu-kiemelt")
    expect(hivas).not.toMatch(/preload:\s*false/)
    expect(hivas).toContain("./betuk/newsreader.woff2")
  })

  it("a dőlt Newsreadert külön hívásban tartja, és nem tölti elő", () => {
    const hivas = betuHivas("--terv-betu-kiemelt-dolt")
    expect(hivas).toMatch(/preload:\s*false/)
    expect(hivas).toContain("./betuk/newsreader-italic.woff2")
    // a normal hivasban nem allhat a dolt fajl: a `src`-tombbol mindkettot elotoltene
    expect(betuHivas("--terv-betu-kiemelt")).not.toContain("italic")
  })

  it("a dőlt szöveget a stíluslap a dőlt családra köti", () => {
    // a ket hivas ket csaladnevet ad: e nelkul a velemenyek idezete a normal
    // betubol SZINTETIZALT doltet kapna, es semmi nem szolna
    const css = readFileSync(
      join(__dirname, "..", "styles", "globals.css"),
      "utf8",
    )
    expect(css).toMatch(
      /\.font-kiemelt\.italic\s*\{[^}]*var\(--terv-betu-kiemelt-dolt\)/,
    )
  })

  it("a fő betűket (törzs és fejléc) előtölti", () => {
    for (const fo of ["--terv-betu-fo", "--acr-font-hanken"])
      expect(betuHivas(fo), fo).not.toMatch(/preload:\s*false/)
  })
})
