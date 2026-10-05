import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A BETUK A REPOBOL JONNEK (acrobot 26240, 2026-10-05). MI PIROSIT: egy
 * `next/font/google` import barhol a kirakat kodjaban (a build ujra a
 * Google-tol fuggene, ami a stage-en ketszer is megallitott egy kiadast); egy
 * `localFont` utvonal, ami nem letezo fajlra mutat (a build ott allna el); egy
 * repoba tett betu licenc nelkul.
 *
 * A HATARA: forrast olvas. Hogy a bongeszo a betut tenyleg megkapja es abban
 * rajzol, azt nem meri; a jelkeszletet a `FORRAS.md` visszamerese adja.
 */
const SRC = join(__dirname, "..", "..")
const BETUK = __dirname

function forrasFajlok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) {
      talalt.push(...forrasFajlok(ut))
      continue
    }
    if (/\.tsx?$/.test(nev) && !/\.spec\.tsx?$/.test(nev)) talalt.push(ut)
  }
  return talalt
}

/** A megjegyzesek kiszedve: egy emlites nem import. */
const kod = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const forrasok = forrasFajlok(SRC).map((ut) => ({
  ut,
  kod: kod(readFileSync(ut, "utf-8")),
}))

const helyiBetuk = forrasok.flatMap(({ ut, kod }) =>
  kod.includes('from "next/font/local"')
    ? Array.from(kod.matchAll(/["'](\.{1,2}\/[^"']+\.woff2)["']/g), (m) => ({
        ut,
        fajl: join(dirname(ut), m[1]),
      }))
    : [],
)

describe("a kirakat betűi a repóból jönnek", () => {
  it("sehol nincs next/font/google import", () => {
    expect(
      forrasok
        .filter(({ kod }) => kod.includes("next/font/google"))
        .map(({ ut }) => ut.slice(SRC.length + 1)),
    ).toEqual([])
  })

  /** ISMERT POZITIV KONTROLL: a layout es a mintalap betuit latja a kereses. */
  it("a keresés látja a layout és a mintalap helyi betűit", () => {
    const hivok = new Set(helyiBetuk.map(({ ut }) => ut.slice(SRC.length + 1)))
    expect(hivok).toEqual(
      new Set([join("app", "layout.tsx"), join("app", "tokenek", "page.tsx")]),
    )
    expect(helyiBetuk.length).toBeGreaterThanOrEqual(7)
  })

  it("minden helyi betű útvonala létező fájlra mutat", () => {
    expect(helyiBetuk.filter(({ fajl }) => !existsSync(fajl))).toEqual([])
  })

  it("minden repóba tett betű mellett ott a családja licence", () => {
    const betuk = readdirSync(BETUK).filter((nev) => nev.endsWith(".woff2"))
    const licencek = readdirSync(join(BETUK, "licencek"))
    expect(betuk).toHaveLength(6)
    for (const betu of betuk) {
      const csalad = betu.replace(/(-italic)?\.woff2$/, "").replace(/-/g, "")
      expect(licencek, betu).toContain(`${csalad}-OFL.txt`)
    }
  })
})
