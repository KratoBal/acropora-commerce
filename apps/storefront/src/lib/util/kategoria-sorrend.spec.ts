import { describe, expect, it } from "vitest"

import { KATEGORIA_SORREND, sorrendbeRakva } from "./kategoria-sorrend"

const kat = (name: string) => ({ name })

describe("a kategóriák közös sorrendje", () => {
  it("a rögzített lista pontosan a kért négy név, ebben a sorrendben", () => {
    expect([...KATEGORIA_SORREND]).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  /**
   * A BOLT SAJAT SORRENDJE MAS, ES EZ NEM ELMELETI: a `rank` mezo
   * Termekek, Gerinctelenek, Halak, Korallok sorrendet ad, tehat a MASODIK
   * elemtol elter attol, amit kertek.
   */
  it("a bolt rank szerinti sorrendjét átrendezi a kértre", () => {
    const boltSzerint = [
      kat("Termékek"),
      kat("Gerinctelenek"),
      kat("Halak"),
      kat("Korallok"),
    ]

    expect(sorrendbeRakva(boltSzerint).map((k) => k.name)).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  /**
   * ES A MASIK IRANY, AMI A LABLECBEN A LENYEG: egy nem nevezett gyoker NEM
   * TUNIK EL, hanem a vegere kerul. Szuressel csendben eltunne, es a lablec
   * terkep-szerepben all -- ott a rejtve marado hiba a dragabb.
   */
  it("a listán kívüli kategória megmarad, a sor végén", () => {
    const otodikkel = [
      kat("Gerinctelenek"),
      kat("Édesvízi akvarisztika"),
      kat("Termékek"),
    ]

    expect(sorrendbeRakva(otodikkel).map((k) => k.name)).toEqual([
      "Termékek",
      "Gerinctelenek",
      "Édesvízi akvarisztika",
    ])
  })

  /**
   * TOBB NEM NEVEZETT ELEMNEL A BEERKEZESI SORREND MARAD -- ma az a bolt
   * `rank` mezoje. Ez nem veletlen: a rendezes stabil, es a lablec eddig is
   * abbol dolgozott.
   */
  it("több nem nevezett elem a beérkezési sorrendjében marad", () => {
    const kettoIsmeretlen = [
      kat("Shop 'n the Shop"),
      kat("Édesvízi akvarisztika"),
      kat("Halak"),
    ]

    expect(sorrendbeRakva(kettoIsmeretlen).map((k) => k.name)).toEqual([
      "Halak",
      "Shop 'n the Shop",
      "Édesvízi akvarisztika",
    ])
  })

  it("nem módosítja a kapott tömböt", () => {
    const eredeti = [kat("Halak"), kat("Termékek")]

    sorrendbeRakva(eredeti)

    expect(eredeti.map((k) => k.name)).toEqual(["Halak", "Termékek"])
  })
})
