import { describe, expect, it } from "vitest"

import {
  gyokerSorok,
  keresesCim,
  szurtAzonositok,
  type TalalatTermek,
} from "./kereses-talalatok"

const gyoker = (id: string, name: string) => ({
  id,
  name,
  parent_category_id: null,
})
const gyerek = (id: string, szulo: string) => ({
  id,
  name: id,
  parent_category_id: szulo,
})

const TERMEKEK: TalalatTermek[] = [
  {
    id: "p1",
    collection: { id: "ati", title: "ATI" },
    categories: [gyoker("tech", "Technika"), gyerek("led", "tech")],
  },
  {
    id: "p2",
    collection: { id: "dd", title: "D-D" },
    // Ugyanaz a gyoker ketszer: egy termek egyszer szamol.
    categories: [gyoker("tech", "Technika"), gyoker("tech", "Technika")],
  },
  {
    id: "p3",
    collection: { id: "ati", title: "ATI" },
    categories: [gyoker("korall", "Korallok"), gyerek("sps", "korall")],
  },
  { id: "p4", collection: null, categories: [gyoker("akva", "Akvárium")] },
]

/**
 * A GYOKER-FULEK SZAMAI. MI PIROSIT: ha egy alkategoria fulet kap; ha egy
 * termek egy gyokeret ketszer szamol; ha a sorrend nem a darabszam, egyenlo
 * szamnal a magyar ABC szerinti nev.
 */
describe("a találatok gyökér-kategóriái", () => {
  it("csak a gyökerek, termékenként egyszer, darabszám szerint csökkenő", () => {
    expect(gyokerSorok(TERMEKEK)).toEqual([
      { id: "tech", nev: "Technika", szam: 2 },
      { id: "akva", nev: "Akvárium", szam: 1 },
      { id: "korall", nev: "Korallok", szam: 1 },
    ])
  })

  it("név nélküli gyökérnél az azonosító áll", () => {
    expect(
      gyokerSorok([
        {
          id: "x",
          categories: [{ id: "g", name: "  ", parent_category_id: null }],
        },
      ]),
    ).toEqual([{ id: "g", nev: "g", szam: 1 }])
  })
})

/**
 * A SZURT AZONOSITOK. MI PIROSIT: ha a szuro a kereses sorrendjet
 * felborítja; ha a gyoker vagy a marka nem szukit; ha egy ismeretlen
 * (be nem sorolt) azonosito szurt nezetben talalatnak marad.
 */
describe("a szűrt azonosítók", () => {
  const ids = ["p3", "p1", "p2", "p4", "ismeretlen"]

  it("szűrő nélkül minden azonosító marad, a keresés sorrendjében", () => {
    expect(szurtAzonositok(ids, TERMEKEK, {})).toEqual(ids)
  })

  it("a gyökér szűkít, a sorrend a keresésé", () => {
    expect(szurtAzonositok(ids, TERMEKEK, { gyoker: "tech" })).toEqual([
      "p1",
      "p2",
    ])
  })

  it("a márka szűkít, és a gyökérrel együtt a metszet marad", () => {
    expect(szurtAzonositok(ids, TERMEKEK, { markak: ["ati"] })).toEqual([
      "p3",
      "p1",
    ])
    expect(
      szurtAzonositok(ids, TERMEKEK, { gyoker: "tech", markak: ["ati"] }),
    ).toEqual(["p1"])
  })

  it("az ismeretlen azonosító szűrt nézetben kimarad", () => {
    expect(szurtAzonositok(ids, TERMEKEK, { markak: ["ati", "dd"] })).toEqual([
      "p3",
      "p1",
      "p2",
    ])
  })
})

/**
 * A TALALATI LAP CIME. MI PIROSIT: ha a kereses kiesik egy szuro-linkbol
 * (akkor a link a "Minden termék" lapra vinne); ha az elso lap `page=1`-et
 * kap; ha a markak nem ismetelt parameterkent mennek.
 */
describe("a találati lap címe", () => {
  it("a keresés mindig benne van, a többi csak ha van értéke", () => {
    expect(keresesCim({ q: "lámpa led" })).toBe("?q=l%C3%A1mpa+led")
    expect(keresesCim({ q: "led", page: 1 })).toBe("?q=led")
  })

  it("gyökér, márkák, rendezés és lap, ebben a sorrendben", () => {
    expect(
      keresesCim({
        q: "led",
        gyoker: "tech",
        markak: ["ati", "dd"],
        sortBy: "price_asc",
        page: 3,
      }),
    ).toBe("?q=led&gyoker=tech&marka=ati&marka=dd&sortBy=price_asc&page=3")
  })
})
