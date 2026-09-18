import { describe, expect, it } from "vitest"

import {
  FIZETESI_SZEREP_CIMKE,
  engedelyezettFizetesiModok,
} from "./fizetesi-modok"

const REGIO = [{ id: "pp_system_default" }, { id: "pp_acropora_cod" }]

describe("engedelyezettFizetesiModok", () => {
  it("egy nehezaru kosaron csak az utanvet marad, mert a bolti fizetes nem engedelyezett", () => {
    expect(
      engedelyezettFizetesiModok(REGIO, [
        { id: "pp_acropora_cod", role: "COD" },
      ]),
    ).toEqual([{ id: "pp_acropora_cod", role: "COD" }])
  })

  /**
   * A MASIK IRANY, ES ENELKUL AZ ELSO ALLITAS NEM BIZONYIT SEMMIT: egy olyan
   * valtozat, ami egyszeruen visszaadja a regio teljes listajat, az elso
   * teszten is atmenne, ha a regio veletlenul egy elemu lenne.
   */
  it("bolti atvetelnel az utanvet KIESIK, holott a regio kinalja", () => {
    const eredmeny = engedelyezettFizetesiModok(REGIO, [
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])

    expect(eredmeny).toEqual([
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])
    expect(eredmeny.map((mod) => mod.id)).not.toContain("pp_acropora_cod")
  })

  it("amit a hatter enged, de a regio nem kinal, az kiesik", () => {
    expect(
      engedelyezettFizetesiModok(REGIO, [
        { id: "pp_simplepay", role: "ONLINE_CARD" },
        { id: "pp_acropora_cod", role: "COD" },
      ]),
    ).toEqual([{ id: "pp_acropora_cod", role: "COD" }])
  })

  it("ures engedely-lista eseten semmit nem kinalunk", () => {
    expect(engedelyezettFizetesiModok(REGIO, [])).toEqual([])
  })

  it("a sorrendet a hatter valasza adja, nem a regioe", () => {
    expect(
      engedelyezettFizetesiModok(REGIO, [
        { id: "pp_acropora_cod", role: "COD" },
        { id: "pp_system_default", role: "PAY_AT_STORE" },
      ]).map((mod) => mod.id),
    ).toEqual(["pp_acropora_cod", "pp_system_default"])
  })

  it("minden szerephez tartozik magyar cimke", () => {
    expect(FIZETESI_SZEREP_CIMKE.COD).toBe("Utánvét")
    expect(Object.values(FIZETESI_SZEREP_CIMKE).every(Boolean)).toBe(true)
  })
})
