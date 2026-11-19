import { readFileSync } from "node:fs"
import { join } from "node:path"
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
