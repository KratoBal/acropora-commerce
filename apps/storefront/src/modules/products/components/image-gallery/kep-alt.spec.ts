import { describe, expect, it } from "vitest"

import { galeriaAlt } from "./kep-alt"

/**
 * A GALERIA ALT-JA A TERMEK NEVE (FE-1, az 5. pont).
 *
 * MI PIROSIT: ha generikus szo kerul vissza (`Termékfotó`), ha az elso kep is
 * sorszamot kap, vagy ha nev nelkul nem ures.
 */
describe("a galéria képének alt-ja", () => {
  it("a termék neve, a második képtől sorszámmal", () => {
    expect(galeriaAlt("Vitalis LPS Coral Pellets", 0, 3)).toBe(
      "Vitalis LPS Coral Pellets",
    )
    expect(galeriaAlt("Vitalis LPS Coral Pellets", 1, 3)).toBe(
      "Vitalis LPS Coral Pellets (2. kép)",
    )
    expect(galeriaAlt(" Hanna ", 0, 1)).toBe("Hanna")
  })

  it("név nélkül üres, nem generikus", () => {
    expect(galeriaAlt(null, 0, 1)).toBe("")
    expect(galeriaAlt("  ", 2, 3)).toBe("")
  })
})
