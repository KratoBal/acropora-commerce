import { describe, expect, it } from "vitest"

import {
  FIZETESI_SZEREP_CIMKE,
  engedelyezettFizetesiModok,
  fizetesiModAlcim,
  fizetesiModCimke,
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
        { id: "pp_masik_kartya", role: "ONLINE_CARD" },
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
    // PD-002: "Fizetés átvételkor", nem "Fizetés a boltban".
    expect(FIZETESI_SZEREP_CIMKE.PAY_AT_STORE).toBe("Fizetés átvételkor")
    expect(Object.values(FIZETESI_SZEREP_CIMKE).every(Boolean)).toBe(true)
  })
})

/**
 * A STRIPE AZ EGYETLEN KARTYAS SZOLGALTATO (Balazs 2026-10-05). MI PIROSIT: a
 * felirat a szolgaltato nevet hordozza (a vevo egy cegnevet olvasna a
 * fizetesi mod helyett), vagy nem a szerepbol jon.
 */
describe("fizetesiModCimke", () => {
  it("a felirat a szerepé, a szolgáltató neve nélkül", () => {
    expect(
      fizetesiModCimke({ id: "pp_stripe_stripe", role: "ONLINE_CARD" }),
    ).toBe("Bankkártyás fizetés")
    expect(fizetesiModCimke({ id: "pp_acropora_cod", role: "COD" })).toBe(
      "Utánvét",
    )
  })

  // bb3a6bd5: a pénztárban nem fizet; a díjbekérő emailben jön, 8 napos határidővel
  it("az előre utalás címe és alcíme megmondja, mi történik; a többinek nincs alcíme", () => {
    const utalas = {
      id: "pp_acropora_transfer",
      role: "BANK_TRANSFER",
    } as const
    expect(fizetesiModCimke(utalas)).toBe("Előre utalás")
    expect(fizetesiModAlcim(utalas)).toBe(
      "Díjbekérő emailben, 8 napos fizetési határidővel",
    )
    expect(
      fizetesiModAlcim({ id: "pp_acropora_cod", role: "COD" }),
    ).toBeUndefined()
  })
})
