import { describe, expect, it } from "vitest"

import {
  markaAzonositok,
  markaSorok,
  markaValtas,
  szuroCim,
} from "./marka-szuro"

/**
 * A MARKA SZURO TISZTA DONTESEI. MI PIROSIT: ha a cim ismetlodo vagy ures
 * markat visz tovabb; ha a darabszam nem a termekeket szamolja, vagy a
 * marka nelkuli termek sort kap; ha a valtas nem kapcsol ki; ha a szuro-cim
 * elveszti a rendezest, az opcio-szurot vagy a markat.
 */
describe("a márka szűrő", () => {
  it("a cím paraméterei: vágva, üresek és ismétlés nélkül", () => {
    expect(markaAzonositok(undefined)).toEqual([])
    expect(markaAzonositok(" pcol_a ")).toEqual(["pcol_a"])
    expect(markaAzonositok(["pcol_a", "", "pcol_b", "pcol_a"])).toEqual([
      "pcol_a",
      "pcol_b",
    ])
  })

  it("márkánként számol, csökkenő sorrendben, márka nélküli termék nélkül", () => {
    const c = (id: string, title: string) => ({ collection: { id, title } })
    expect(
      markaSorok([
        c("pcol_ati", "ATI"),
        { collection: null },
        c("pcol_ai", "Aqua Illumination"),
        c("pcol_ati", "ATI"),
        {},
        c("pcol_dd", "D-D"),
      ]),
    ).toEqual([
      { id: "pcol_ati", nev: "ATI", szam: 2 },
      { id: "pcol_ai", nev: "Aqua Illumination", szam: 1 },
      { id: "pcol_dd", nev: "D-D", szam: 1 },
    ])
  })

  it("a váltás be- és kikapcsol", () => {
    expect(markaValtas([], "a")).toEqual(["a"])
    expect(markaValtas(["a", "b"], "a")).toEqual(["b"])
  })

  it("a szűrő-cím mindent megtart, és lap nélkül az első lapra visz", () => {
    expect(
      szuroCim({
        sortBy: "price_asc",
        optionValueIds: ["o1"],
        markak: ["pcol_a", "pcol_b"],
      }),
    ).toBe("?sortBy=price_asc&optionValueIds=o1&marka=pcol_a&marka=pcol_b")
    expect(szuroCim({ markak: ["pcol_a"], page: 3 })).toBe(
      "?marka=pcol_a&page=3",
    )
    expect(szuroCim({})).toBe("?")
  })
})
