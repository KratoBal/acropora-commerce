import { describe, expect, it } from "vitest"

import { szuroCim } from "./marka-szuro"
import {
  tartasiSorok,
  tartasiSzuroAktiv,
  tartasiSzuroKeresbol,
  tartasiValtas,
  valaszAlak,
} from "./tartasi-szuro"

/*
  A TARTASI SZURO A CIMBEN (V2.2 S5). MI PIROSIT: egy ismeretlen vagy ismetelt ertek atjut; a valtas a csoport tobbi
  erteket elviszi; a cim nem viszi a szurot; egy hibas valasz-alak adatkent atmegy.
*/
describe("a tartási szűrő a címben", () => {
  it("csak az ismert értékek, egyszer", () => {
    const s = tartasiSzuroKeresbol({
      nehezseg: ["KONNYU", "KONNYU", "KITALALT"],
      korallos: "1",
      medence: ["301-", "300+"],
    })
    expect(s).toEqual({
      nehezseg: ["KONNYU"],
      korallos: true,
      medence: ["301-"],
    })
    expect(tartasiSzuroAktiv(s)).toBe(true)
    expect(
      tartasiSzuroAktiv(tartasiSzuroKeresbol({ korallos: "0", marka: "x" })),
    ).toBe(false)
  })

  it("a váltás egy értéket kapcsol, a csoport többi értéke marad", () => {
    const s = tartasiSzuroKeresbol({ nehezseg: "KONNYU" })
    expect(tartasiValtas(s, { nehezseg: "HALADO" }).nehezseg).toEqual([
      "KONNYU",
      "HALADO",
    ])
    expect(tartasiValtas(s, { nehezseg: "KONNYU" }).nehezseg).toEqual([])
    expect(tartasiValtas(s, { korallos: true }).korallos).toBe(true)
  })

  it("a cím a többi szűrő után viszi", () => {
    expect(
      szuroCim({
        sortBy: "price_asc",
        markak: ["m"],
        tartas: { nehezseg: ["KOZEPES"], korallos: true, medence: ["0-100"] },
        page: 2,
      }),
    ).toBe(
      "?sortBy=price_asc&marka=m&nehezseg=KOZEPES&korallos=1&medence=0-100&page=2",
    )
  })
})

describe("a bolt válasza", () => {
  const jo = {
    product_ids: ["a"],
    unchecked: 1,
    complete: true,
    facets: {
      difficulty: { KONNYU: 1, KOZEPES: 0, HALADO: 0, SZAKERTO: 0 },
      reef_safe: 0,
      tank: { "0-100": 0, "101-300": 2, "301-": 0 },
    },
  }

  it("a jó alak átmegy, a sorok csak a nem nulla értékre", () => {
    const v = valaszAlak(jo)
    expect(v).toEqual(jo)
    const sorok = tartasiSorok(v!, tartasiSzuroKeresbol({}))
    expect(sorok.nehezseg.map((s) => s.kulcs)).toEqual(["KONNYU"])
    expect(sorok.korallos).toEqual([])
    expect(sorok.medence.map((s) => [s.felirat, s.szam])).toEqual([
      ["101–300 l", 2],
    ])
  })

  it("egy hiányzó vagy rossz mező az egészet érvényteleníti", () => {
    for (const rossz of [
      null,
      {},
      { ...jo, product_ids: [1] },
      { ...jo, unchecked: -1 },
      { ...jo, complete: "igen" },
      { ...jo, facets: { ...jo.facets, tank: { "0-100": 0 } } },
      { ...jo, facets: { ...jo.facets, reef_safe: 1.5 } },
    ])
      expect(valaszAlak(rossz), JSON.stringify(rossz)).toBeNull()
  })
})
