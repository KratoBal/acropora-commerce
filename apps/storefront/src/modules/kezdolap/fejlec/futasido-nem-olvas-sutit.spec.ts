import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A KEZDOLAP ELRENDEZESE ES FEJLECE NEM OLVAS SUTIT (barracuda, #556).
 *
 * Egyetlen `cookies()`/`headers()` hivas az elrendezesben az ALATTA LEVO LAPOT
 * is dinamikussa teszi: a kezdolap `private, no-store` valaszt kapna (FE-7). Az
 * `isr-lapok.spec` a `page.tsx` forrasat nezi, a layout fajat nem, ez az
 * allitas a layout-ot es a fejlec szerver-fajljait nezi. A kosar a kliensen
 * jon (`CartButton` "use client", `useKosarAllapot`), a kategoriak es a
 * tartalom publikus lekeres (`getPublicCacheOptions`).
 *
 * A futasideju bizonyitek (`x-nextjs-cache: HIT`, `s-maxage=300`) a stage
 * merese; ez a forras-szintu orzo, ami elbukik, ha valaki sutit olvaso hivast
 * kot a fejlecbe.
 *
 * MI PIROSIT: a layout vagy a fejlec szerver-fajlja `next/headers`-t, a suti-
 * olvaso adatreteget (`getCacheOptions`, `getAuthHeaders`, `retrieveCart`,
 * `retrieveCustomer`) vagy `cookies()`-t hasznal; a `CartButton` elveszti a
 * "use client" jelzot.
 */
const SRC = join(__dirname, "..", "..", "..")
const FAJLOK = [
  join(SRC, "app", "[countryCode]", "(kezdolap)", "layout.tsx"),
  join(SRC, "app", "[countryCode]", "(kezdolap)", "page.tsx"),
  ...readdirSync(__dirname)
    .filter((n) => /\.(ts|tsx)$/.test(n) && !n.includes(".spec."))
    .map((n) => join(__dirname, n)),
  join(SRC, "lib", "data", "kezdolap-tartalom.ts"),
]

const TILTOTT =
  /next\/headers|getCacheOptions|getAuthHeaders|retrieveCart|retrieveCustomer|\bcookies\s*\(|\bheaders\s*\(/

describe("a kezdőlap elrendezése és fejléce nem olvas sütit", () => {
  it("van vizsgált fájl", () => {
    expect(FAJLOK.length).toBeGreaterThanOrEqual(6)
  })

  it.each(FAJLOK)("%s", (ut) => {
    const kod = readFileSync(ut, "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
    expect(kod).not.toMatch(TILTOTT)
  })

  it("a kosár-gomb kliens-komponens, a kosár a kliens állapotából jön", () => {
    const kod = readFileSync(
      join(SRC, "modules", "layout", "components", "cart-button", "index.tsx"),
      "utf-8",
    )
    expect(kod.trimStart().startsWith('"use client"')).toBe(true)
    expect(kod).toContain("useKosarAllapot")
  })
})
