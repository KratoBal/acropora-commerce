import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * AZ ISMERETLEN CIM KERETES 404-E, CATCH-ALL UTVONAL NELKUL (2026-11-19, kirakat-kinezet lista).
 *
 * MI PIROSIT: ha a gyoker not-found-ja nem a kozos keretben (`AruhazKeret`) rajzolja a
 * "Nincs ilyen oldal"-t (akkor az ismeretlen cim megint keret nelkul jon); ha az `app` alatt
 * egy `[...x]` vagy `[[...x]]` mappa all az orszag-szegmens szintjen (`[countryCode]/[...x]`, route-csoporttal is): a Next.js 15.5 a `/account` parhuzamos utvonalait
 * (`@login`, `@dashboard`) mellette "Expected clientReferenceManifest to be defined" hibaval
 * 500-ra viszi `next start` alatt, vagyis a fiok eltorik, es a fejlec fiok-linkjenek elotoltese
 * miatt MINDEN fejleces lap axe-tesztje idotullepeskor bukik (a #830 harmadik piros CI-ja,
 * merve 2026-11-19, helyben: ugyanaz a fa a catch-all nelkul /hu/account 200, vele 500).
 */
const APP = __dirname

function mappak(ut: string): string[] {
  return readdirSync(ut).flatMap((nev) => {
    const teljes = join(ut, nev)
    return statSync(teljes).isDirectory() ? [teljes, ...mappak(teljes)] : []
  })
}

const kod = (forras: string) =>
  forras.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ")

describe("az ismeretlen cim 404-e", () => {
  it("a mero latja a fiok parhuzamos utvonalait (pozitiv kontroll)", () => {
    const rel = mappak(APP).map((m) => relative(APP, m))
    expect(rel.some((m) => m.endsWith("account/@login"))).toBe(true)
    expect(rel.some((m) => m.endsWith("account/@dashboard"))).toBe(true)
  })

  it("nincs catch-all utvonal az orszag-szegmens szintjen (a fiok testverekent)", () => {
    // a route-csoportok nem szegmensek: `[countryCode]/(main)/[...x]` ugyanaz, mint `[countryCode]/[...x]`
    // (a `categories/[...category]` egy statikus szegmens alatt all, az nem testvere a fioknak)
    const talalat = mappak(APP)
      .map((m) => relative(APP, m))
      .filter((m) => {
        const szegmensek = m.split("/").filter((s) => !/^\(.*\)$/.test(s))
        return (
          szegmensek.length === 2 &&
          szegmensek[0] === "[countryCode]" &&
          /^\[\[?\.\.\.[^\]]+\]\]?$/.test(szegmensek[1]!)
        )
      })
    expect(talalat).toEqual([])
  })

  it("a gyoker not-found a kozos keretben rajzolja az oldalt", () => {
    const forras = kod(readFileSync(join(APP, "not-found.tsx"), "utf8"))
    expect(forras).toMatch(/<AruhazKeret\b[^>]*countryCode=/)
    expect(forras).toMatch(/<NincsOldal\b/)
  })
})
