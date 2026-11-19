import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/*
  A KIRAKAT ATHUZOTT ARA NEM A LISTAARBOL JON (Omnibus 2/A., acrobot eles-kiadasi feltetel 2, 2026-11-19). Az ar-objektum
  `original_price` mezeje a sale arlista listaara (a UNAS-ra fagyott alapar), nem egy korabbi eladasi ar; megjeleniteni csak
  a `reduction` (30 napos legalacsonyabb ar) mehet. Ez az orzo a FORRAST nezi: egy uj megjelenito, ami az `original_price`-t
  kirajzolna, egy komponens-teszttel nem fogna meg, mert annak a teszt nem ismeri a helyet.
  MI PIROSIT: ha a modulokban valahol az `original_price` / `original_price_number` mezot kirajzolja valami; ha a pozitiv
  kontroll (a `reduction.reference_price` hasznalata) eltunne a negy megjelenitobol (a termeklap, a ragados sav, az
  elonezet, a kartya).
*/
const ROOT = join(process.cwd(), "src")

function fajlok(mappa: string): string[] {
  return readdirSync(mappa).flatMap((nev) => {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) return fajlok(ut)
    return /\.tsx?$/.test(nev) && !/\.(spec|test)\./.test(nev) ? [ut] : []
  })
}

const kod = (forras: string) =>
  forras.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ")

describe("az áthúzott ár forrása", () => {
  const mind = fajlok(ROOT).map((ut) => ({
    ut: relative(ROOT, ut),
    forras: kod(readFileSync(ut, "utf-8")),
  }))

  it("a modulokban senki nem rajzolja ki az original_price mezőt (csak az ár-objektum és a típusa viseli)", () => {
    const talalat = mind
      .filter(
        (f) =>
          f.ut.startsWith("modules/") &&
          /\.original_price(_number)?\b/.test(f.forras),
      )
      .map((f) => f.ut)
    expect(talalat).toEqual([])
  })

  it("a kosár és a rendelés sorai sem az original_total mezőből húznak át (a listaár / kupon előtti összeg nem korábbi ár)", () => {
    const talalat = mind
      .filter(
        (f) =>
          f.ut.startsWith("modules/") && /\.original_total\b/.test(f.forras),
      )
      .map((f) => f.ut)
    expect(talalat).toEqual([])
  })

  it("pozitív kontroll: a négy megjelenítő a reduction referencia-árát használja", () => {
    const hasznalok = mind
      .filter(
        (f) =>
          f.ut.startsWith("modules/") &&
          /(reduction|csokkentes)[.?]+reference_price/.test(f.forras),
      )
      .map((f) => f.ut)
      .sort()
    expect(hasznalok).toEqual([
      "modules/categories/templates/commerce/termek-kartya.tsx",
      "modules/products/components/product-actions/mobile-actions.tsx",
      "modules/products/components/product-preview/price.tsx",
      "modules/products/components/product-price/index.tsx",
    ])
  })
})
