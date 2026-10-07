import { describe, expect, it } from "vitest"

import { lapHref, lapozoKeres } from "./lap-href"

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

/*
  A LAPOZO QUERY-JE A SZERVERTOL (FE-7 3. resz). MI PIROSIT: a `page` benne
  marad (minden link ugyanarra a lapra mutatna); egy tobbertek-parameter
  (`optionValueIds`) csak az elso erteket viszi; ures erteket `undefined`-kent
  ir ki.
*/
describe("a lapozó query-je", () => {
  it("a page nélkül, a többi paraméter és minden értéke marad", () => {
    expect(
      lapozoKeres({
        sortBy: "price_asc",
        page: "3",
        optionValueIds: ["a", "b"],
        q: undefined,
      }),
    ).toBe("sortBy=price_asc&optionValueIds=a&optionValueIds=b")
  })

  it("statikus lapon üres", () => {
    expect(lapozoKeres({})).toBe("")
    expect(lapozoKeres({ page: "2" })).toBe("")
  })
})
