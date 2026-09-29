import { describe, expect, it } from "vitest"

import { fejlecSorrend } from "./fejlec-sorrend"

const g = (handle: string) => ({ handle })
const handlek = (lista: { handle: string }[]) => lista.map((x) => x.handle)

/**
 * Balazs dontese (2026-09-09): "Termékek, Halak, Korallok, Gerinctelenek".
 *
 * MI PIROSIT: a katalogus sorrendje (a stage mai allapota: Termékek,
 * Gerinctelenek, Halak, Korallok); egy ekezet-erzekeny osszevetes (a stage
 * handle-je `termékek`); egy uj gyoker, ami kiesik vagy elore kerul; egy
 * instabil rendezes az ismeretlenek kozott.
 */
describe("fejlecSorrend", () => {
  it("a stage mai sorrendjét Balázs sorrendjére rendezi", () => {
    expect(
      handlek(
        fejlecSorrend([
          g("termékek"),
          g("gerinctelenek"),
          g("halak"),
          g("korallok"),
        ]),
      ),
    ).toEqual(["termékek", "halak", "korallok", "gerinctelenek"])
  })

  it("ékezettől és kisbetűtől függetlenül azonosít", () => {
    expect(
      handlek(fejlecSorrend([g("Korallok"), g("termekek"), g("HALAK")])),
    ).toEqual(["termekek", "HALAK", "Korallok"])
  })

  it("az ismeretlen új gyökér a végére kerül, a kapott sorrendben", () => {
    expect(
      handlek(
        fejlecSorrend([
          g("edesvizi"),
          g("korallok"),
          g("shop-n-the-shop"),
          g("termékek"),
        ]),
      ),
    ).toEqual(["termékek", "korallok", "edesvizi", "shop-n-the-shop"])
  })

  it("a hiányzó gyökér nem jelenik meg, és nem töri el a többit", () => {
    expect(handlek(fejlecSorrend([g("halak"), g("termékek")]))).toEqual([
      "termékek",
      "halak",
    ])
  })

  it("nem módosítja a kapott tömböt", () => {
    const be = [g("korallok"), g("termékek")]
    fejlecSorrend(be)
    expect(handlek(be)).toEqual(["korallok", "termékek"])
  })
})
