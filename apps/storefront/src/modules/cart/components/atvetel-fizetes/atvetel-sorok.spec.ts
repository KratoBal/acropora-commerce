import { describe, expect, it } from "vitest"

import { atvetelSorok, szallitasiFajta } from "./atvetel-sorok"

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

  it("a bolti átvételt a teljesítési halmaz típusa jelöli (a bolt válasza), a futár-módok nem", () => {
    const sorok = atvetelSorok([
      {
        id: "so_1",
        name: "Bolti átvétel",
        price_type: "flat",
        amount: 0,
        service_zone: { fulfillment_set: { type: "pickup" } },
      },
      {
        id: "so_2",
        name: "GLS házhozszállítás",
        price_type: "calculated",
        service_zone: { fulfillment_set: { type: "shipping" } },
      },
      { id: "so_3", name: "Névtelen típus", price_type: "calculated" },
    ])
    expect(sorok.map((sor) => sor.bolti)).toEqual([true, false, false])
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

/*
  A SZALLITASI MOD FAJTAJA A PENZTAR OSZTALYOZASA SZERINT (a kirakat angol nezete, 2026-11-19). MI PIROSIT: ha a Foxpost, a GLS pont vagy a GLS haz nem a
  sajat fajtajat kapja; ha a nehezaru jelzo elvesz (a nehezaru neve mas); ha egy ismeretlen vagy azonosito nelkuli opcio fajtat kap (a bolt neve marad);
  ha osztalyozas nelkul fajta jelenik meg; ha a fajta a nevbol (nem az azonositobol) kovetkezik (a bolt atnevezne a modot).
*/
describe("szallitasiFajta", () => {
  const osztaly = {
    foxpostOptionId: "so_fox",
    glsPont: [
      { option_id: "so_pont", heavy: false },
      { option_id: "so_pont_nehez", heavy: true },
    ],
    glsHaz: [
      { option_id: "so_haz", heavy: false },
      { option_id: "so_haz_nehez", heavy: true },
    ],
  }

  it("az azonosító szerint adja a fajtát, a nehézáru külön", () => {
    expect(szallitasiFajta("so_fox", osztaly)).toBe("foxpost")
    expect(szallitasiFajta("so_pont", osztaly)).toBe("glsPont")
    expect(szallitasiFajta("so_pont_nehez", osztaly)).toBe("glsPontNehez")
    expect(szallitasiFajta("so_haz", osztaly)).toBe("glsHaz")
    expect(szallitasiFajta("so_haz_nehez", osztaly)).toBe("glsHazNehez")
  })

  it("az ismeretlen, az azonosító nélküli opció és az osztályozás hiánya nem ad fajtát", () => {
    expect(szallitasiFajta("so_mas", osztaly)).toBeNull()
    expect(szallitasiFajta(undefined, osztaly)).toBeNull()
    expect(szallitasiFajta("so_fox", null)).toBeNull()
    expect(szallitasiFajta("so_fox", undefined)).toBeNull()
    // egy Foxpost-azonosító nélküli osztályozás nem egyezik egy üres azonosítóval
    expect(
      szallitasiFajta("", { foxpostOptionId: null, glsPont: [], glsHaz: [] }),
    ).toBeNull()
  })

  it("a sorok a fajtát hordozzák: az azonosító dönt, nem a név", () => {
    const sorok = atvetelSorok(
      [
        {
          id: "so_haz",
          name: "Átnevezett házhozszállítás",
          price_type: "calculated",
        },
        { id: "so_mas", name: "GLS házhozszállítás", price_type: "calculated" },
      ],
      osztaly,
    )
    expect(sorok.map((sor) => sor.fajta)).toEqual(["glsHaz", null])
  })
})
