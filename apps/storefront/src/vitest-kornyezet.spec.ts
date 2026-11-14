import { describe, expect, it } from "vitest"

/**
 * A TESZTFUTAS KORNYEZETE NEM AZ INDITO SHELLE (murena, 2026-11-12). MI PIROSIT: ha a `vitest.config.ts`
 * nem mondja ki a `NODE_ENV=test`-et, es a futast olyan shellbol inditjak, ahol `NODE_ENV=development` all
 * (fejlesztoi gep, agens-kornyezet): a `next/image` ekkor ellenorzi a kulso kep gazdagepet, es a komponens-
 * tesztek tucatjai buknak "hostname is not configured" hibaval, a CI zold marad. Ez az allitas a futas
 * KOZBEN nezi a valtozot, tehat az indito shell erteketol fuggetlenul azt meri, amit a konfig kimond.
 */
describe("a tesztfutás környezete", () => {
  it("NODE_ENV=test, bármilyen shellből indult a futás", () => {
    expect(process.env.NODE_ENV).toBe("test")
  })
})
