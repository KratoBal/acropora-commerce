import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/*
  A KOZLES ES A ROGZITETT MASODIK HELYEK (card 54bb3779). A termeklap ara, a termek-kartya es a vilagos lap ar-doboza renderelheto
  teszttel; a ragados mobil-sav (`mobile-actions.tsx`) es a kezdolap-kartya ar-sora (`product-preview/price.tsx`) NEM (async komponens,
  illetve a sav mockolt a lap tesztjeiben), ezert ez a ketto ELLENORZI A FORRAST: egyik sem dontheti el a kozlest az akcios arlistabol
  (`price_type`) vagy a Medusa alaparabol (`original_price`); csak a `reduction` mezo (a 30 napos legalacsonyabb ar) szolhat.
  MI PIROSIT: valaki visszatesz egy `price_type === "sale"` agat vagy egy `original_price` kiirast az egyik ketto koze.
*/
const olvas = (relativ: string) =>
  readFileSync(join(__dirname, relativ), "utf8")

describe("a ket nem renderelheto ar-hely nem dont maga a kozlesrol", () => {
  for (const [nev, fajl] of [
    ["a ragados mobil-sav", "product-actions/mobile-actions.tsx"],
    ["a kezdolap-kartya ar-sora", "product-preview/price.tsx"],
  ] as const) {
    it(`${nev}: nincs benne price_type-os dontes es nincs alapar-kiiras, van benne a reduction`, () => {
      const forras = olvas(fajl)
      expect(forras).not.toMatch(/price_type\s*===\s*["']sale["']/)
      expect(forras).not.toMatch(/\boriginal_price\b/)
      expect(forras).toMatch(/\.reduction\b/)
    })
  }
})

/*
  A KOSAR- ES RENDELES-SOROK SEM A `original_total` MEZOBOL HUZNAK AT (acrobot 57134 es 57179, barracuda 57178). A sor `original_total`-ja a
  listaar vagy a kupon elotti osszeg: nem egy korabbi eladasi ar, es a kupon nem arcsokkentes. Az athuzast a `sorCsokkentes` dont (a
  kedvezmeny elotti `unit_price`-ból, a valtozat metaadataval). MI PIROSIT: valaki a modulokban az `original_total`-t kirajzolja
  vagy abbol szamol szazalekot; a pozitiv kontroll: a harom sor-megjelenito a `sorCsokkentes`-t hasznalja.
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

describe("a kosár- és rendelés-sorok áthúzása", () => {
  const mind = fajlok(join(ROOT, "modules")).map((ut) => ({
    ut: relative(ROOT, ut),
    forras: kod(readFileSync(ut, "utf8")),
  }))

  it("a modulokban senki nem olvassa az original_total mezőt", () => {
    expect(
      mind.filter((f) => /\.original_total\b/.test(f.forras)).map((f) => f.ut),
    ).toEqual([])
  })

  it("pozitív kontroll: a kosár-sor, a közös sor-ár és az egységár a sorCsokkentes-t használja", () => {
    expect(
      mind
        .filter((f) => /\bsorCsokkentes\(/.test(f.forras))
        .map((f) => f.ut)
        .sort(),
    ).toEqual([
      "modules/cart/components/item/index.tsx",
      "modules/common/components/line-item-price/index.tsx",
      "modules/common/components/line-item-unit-price/index.tsx",
    ])
  })
})
