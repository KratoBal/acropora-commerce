import { describe, expect, it } from "vitest"

import { cacheAzonositoKell } from "./cache-azonosito"

const sutik = (...nevek: string[]) => ({
  has: (n: string) => nevek.includes(n),
})

/*
  KINEK JAR A CACHE-SUTI (FE-7 3. resz). MI PIROSIT: egy allapot nelkuli
  latogato `Set-Cookie`-t kap (a publikus lap nem CDN-tarolhato); egy kosaras
  vagy belepett latogato nem kapja vissza a lejart sutit (a kosar-urites
  elmarad); akinek mar van, ujat kap.
*/
describe("a cache-süti", () => {
  it("állapot nélküli látogatónak nem jár", () => {
    expect(cacheAzonositoKell(sutik())).toBe(false)
    expect(cacheAzonositoKell(sutik("valami_mas"))).toBe(false)
  })

  it("kosárral vagy belépéssel jár, ha hiányzik", () => {
    expect(cacheAzonositoKell(sutik("_medusa_cart_id"))).toBe(true)
    expect(cacheAzonositoKell(sutik("_medusa_jwt"))).toBe(true)
  })

  it("aki már kapott, nem kap újat", () => {
    expect(
      cacheAzonositoKell(sutik("_medusa_cart_id", "_medusa_cache_id")),
    ).toBe(false)
  })
})
