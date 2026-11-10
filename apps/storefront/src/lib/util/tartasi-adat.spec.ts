import { describe, expect, it } from "vitest"

import { tartasiAdat } from "./tartasi-adat"

/*
  A TARTASI ADAT OLVASASA (V2.2 S4, murena szerzodese 46072). MI PIROSIT: a kulcs objektumkent vagy hibas JSON-kent dobna,
  ismeretlen verzio vagy fajta adatot adna, egy ismeretlen ertek atjutna (egy kitalalt felirat a lapon), egy negativ vagy
  nem szam meret szamkent jelenne meg, a hianyzo kulcs nem null.
*/
const meta = (o: unknown) => ({ husbandry: JSON.stringify(o) })

describe("a tartási adat olvasása", () => {
  it("a teljes alakot olvassa, kisbetűs snake_case kulcsokkal", () => {
    expect(
      tartasiAdat(
        meta({
          v: 1,
          kind: "fish",
          verified_on: "2026-11-10",
          difficulty: "HALADO",
          min_liter: 300,
          maturity_months: 6,
          reef_safe: "FELTETELES",
          reef_safe_reason: "kis garnélákat megeszik",
          social: "PARBAN",
          aggression: ["TERULETVEDO", "KITALALT"],
          coral_eater: false,
          invertebrate_eater: true,
          feeding: ["HUSEVO"],
          feeding_frequency: "naponta kétszer",
          live_food: false,
          light: "KOZEPES",
          flow: "EROS",
          max_size: { value: 12, dimension: "TESTHOSSZ" },
          sourcing: "TENYESZTETT",
          not_for: "Kezdő, frissen indított medencébe nem.",
        }),
      ),
    ).toEqual({
      kind: "fish",
      verifiedOn: "2026-11-10",
      difficulty: "HALADO",
      minLiter: 300,
      maturityMonths: 6,
      placementZone: null,
      reefSafe: "FELTETELES",
      reefSafeReason: "kis garnélákat megeszik",
      social: "PARBAN",
      aggression: ["TERULETVEDO"],
      coralEater: false,
      invertebrateEater: true,
      feeding: ["HUSEVO"],
      feedingFrequency: "naponta kétszer",
      liveFood: false,
      light: "KOZEPES",
      flow: "EROS",
      maxSize: { value: 12, dimension: "TESTHOSSZ" },
      sourcing: "TENYESZTETT",
      notFor: "Kezdő, frissen indított medencébe nem.",
    })
  })

  it("nincs kulcs, objektum a szöveg helyett, hibás JSON, más verzió vagy ismeretlen fajta: nincs adat", () => {
    for (const metadata of [
      null,
      {},
      { husbandry: { v: 1, kind: "fish" } },
      { husbandry: "{nem json" },
      meta({ v: 2, kind: "fish" }),
      meta({ v: 1, kind: "bird" }),
      meta([1]),
    ])
      expect(
        tartasiAdat(metadata as never),
        JSON.stringify(metadata),
      ).toBeNull()
  })

  it("egy ismeretlen vagy rossz alakú érték csak azt a mezőt teszi ellenőrzés alattivá", () => {
    const a = tartasiAdat(
      meta({
        v: 1,
        kind: "coral",
        difficulty: "KONNYU_IS",
        min_liter: -5,
        max_size: { value: 10, dimension: "MAS" },
        placement_zone: "FELSO",
        live_food: "igen",
      }),
    )!
    expect(a.difficulty).toBeNull()
    expect(a.minLiter).toBeNull()
    expect(a.maxSize).toBeNull()
    expect(a.liveFood).toBeNull()
    expect(a.placementZone).toBe("FELSO")
  })

  it("a medence-érettség 0 is lehet (az OS 0-t is enged); a negatív és a liter 0-ja nem (barracuda, #729)", () => {
    expect(
      tartasiAdat(meta({ v: 1, kind: "coral", maturity_months: 0 }))
        ?.maturityMonths,
    ).toBe(0)
    expect(
      tartasiAdat(meta({ v: 1, kind: "coral", maturity_months: -1 }))
        ?.maturityMonths,
    ).toBeNull()
    expect(
      tartasiAdat(meta({ v: 1, kind: "fish", min_liter: 0 }))?.minLiter,
    ).toBeNull()
  })
})
