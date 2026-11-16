import { describe, expect, it } from "vitest"

import { atvetelSorok } from "./atvetel-sorok"

/*
  AZ ÁTVÉTEL DOBOZ SORAI (task t-20261116-kosar-dobozok). MI PIROSÍT: egy hiányzó összeg nullának számít (a számolt ár ingyenesnek
  látszana); a számolt ár fix árnak látszik; a nulla összegű fix opció (a bolti átvétel) elveszik; a név nélküli opció kirajzolódik;
  a bolt sorrendje felborul; a `null` válasz sorokat ad.
*/
describe("atvetelSorok", () => {
  it("a bolti átvétel fix nulla, a számolt futár-módok cím nélkül nem kapnak összeget (a teszt Medusa 2026-11-16-i válasza)", () => {
    const sorok = atvetelSorok([
      { id: "so_1", name: "Bolti átvétel", price_type: "flat", amount: 0 },
      { id: "so_2", name: "GLS házhozszállítás", price_type: "calculated" },
      { id: "so_3", name: "GLS csomagpont", price_type: "calculated" },
      { id: "so_4", name: "Foxpost csomagpont", price_type: "calculated" },
    ])
    expect(sorok.map((sor) => sor.nev)).toEqual([
      "Bolti átvétel",
      "GLS házhozszállítás",
      "GLS csomagpont",
      "Foxpost csomagpont",
    ])
    expect(sorok[0]!.ar).toEqual({ tipus: "fix", osszeg: 0 })
    for (const sor of sorok.slice(1))
      expect(sor.ar).toEqual({ tipus: "cim-utan" })
  })

  it("egy fix opció hiányzó összege nem nulla: a cím után látszik", () => {
    const sorok = atvetelSorok([
      { id: "so_1", name: "Bolti átvétel", price_type: "flat" },
    ])
    expect(sorok[0]!.ar).toEqual({ tipus: "cim-utan" })
  })

  it("a számolt opció akkor sem fix, ha a válasz mégis hozna összeget", () => {
    const sorok = atvetelSorok([
      {
        id: "so_1",
        name: "GLS házhozszállítás",
        price_type: "calculated",
        amount: 3500,
      },
    ])
    expect(sorok[0]!.ar).toEqual({ tipus: "cim-utan" })
  })

  it("egy élő állatos kosár egyetlen opciót kap, és csak azt mutatja", () => {
    const sorok = atvetelSorok([
      { id: "so_1", name: "Bolti átvétel", price_type: "flat", amount: 0 },
    ])
    expect(sorok).toHaveLength(1)
  })

  it("a név nélküli opció kimarad, az azonosító nélküli kap egy sorszámos azonosítót, a null és az üres lista üres", () => {
    expect(atvetelSorok(null)).toEqual([])
    expect(atvetelSorok(undefined)).toEqual([])
    expect(atvetelSorok([])).toEqual([])
    const sorok = atvetelSorok([
      { name: "  ", price_type: "flat", amount: 0 },
      { name: "Bolti átvétel", price_type: "flat", amount: 0 },
    ])
    expect(sorok).toHaveLength(1)
    expect(sorok[0]!.azonosito).toBe("opcio-1")
  })
})
