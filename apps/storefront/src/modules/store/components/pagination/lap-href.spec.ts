import { describe, expect, it } from "vitest"

import { lapHref } from "./lap-href"

/**
 * A LAPOZO CIMEI (FE-1). MI PIROSIT: ha az 1. lap `?page=1`-et kap (ket cim
 * ugyanarra a tartalomra), ha a tobbi parameter elveszik, vagy ha a lapszam
 * nem kerul a cimbe.
 */
describe("a lapozó címei", () => {
  it("a 2. lap a page paraméterrel, a többi paraméter megmarad", () => {
    expect(lapHref("/hu/categories/szivattyuk", "sortBy=price_asc", 2)).toBe(
      "/hu/categories/szivattyuk?sortBy=price_asc&page=2",
    )
  })

  it("az 1. lapnak nincs page paramétere", () => {
    expect(lapHref("/hu/store", "page=3", 1)).toBe("/hu/store")
    expect(lapHref("/hu/store", "q=hanna&page=3", 1)).toBe("/hu/store?q=hanna")
  })
})
