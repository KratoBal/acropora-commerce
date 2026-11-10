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
      tempC: null,
      salinitySg: null,
      khDkh: null,
      lifespanYears: null,
      stingOrVenom: null,
      handlingWarning: null,
      quarantineWeeks: null,
      acclimatization: null,
      breedsInTank: null,
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

  /*
    AZ OPCIONALIS TENYEK (V2.2 S4b, #2384). MI PIROSIT: egy egyvegu, forditott vagy nem szam tartomany atjut; a karanten
    0 hete hianynak szamit; a csipes vagy mereg a figyelmeztetes nelkul elveszik; egy ismeretlen ertek nem marad null.
  */
  it("az opcionális tények: tartomány két véggel, a 0 hét válasz, a veszély figyelmeztetés nélkül is", () => {
    const a = tartasiAdat(
      meta({
        v: 1,
        kind: "invertebrate",
        temp_c: { min: 24, max: 26 },
        salinity_sg: { min: 1.024, max: 1.026 },
        kh_dkh: { min: 7, max: 9 },
        lifespan_years: 5,
        sting_or_venom: true,
        quarantine_weeks: 0,
        acclimatization: "csepegtetéssel, kb. 1 óra",
        breeds_in_tank: false,
      }),
    )!
    expect(a.tempC).toEqual({ min: 24, max: 26 })
    expect(a.salinitySg).toEqual({ min: 1.024, max: 1.026 })
    expect(a.khDkh).toEqual({ min: 7, max: 9 })
    // az also veg 0 is lehet (az OS a KH-nal 0-t enged), a felso nem (barracuda, #734)
    expect(
      tartasiAdat(meta({ v: 1, kind: "fish", kh_dkh: { min: 0, max: 2 } }))
        ?.khDkh,
    ).toEqual({ min: 0, max: 2 })
    expect(
      tartasiAdat(meta({ v: 1, kind: "fish", kh_dkh: { min: 0, max: 0 } }))
        ?.khDkh,
    ).toBeNull()
    expect(a.lifespanYears).toBe(5)
    expect(a.stingOrVenom).toBe(true)
    expect(a.handlingWarning).toBeNull()
    expect(a.quarantineWeeks).toBe(0)
    expect(a.acclimatization).toBe("csepegtetéssel, kb. 1 óra")
    expect(a.breedsInTank).toBe(false)
    for (const rossz of [
      { min: 24 },
      { min: 26, max: 24 },
      { min: "24", max: 26 },
      [24, 26],
      24,
    ]) {
      expect(
        tartasiAdat(meta({ v: 1, kind: "fish", temp_c: rossz }))?.tempC,
        JSON.stringify(rossz),
      ).toBeNull()
    }
    expect(
      tartasiAdat(meta({ v: 1, kind: "fish", sting_or_venom: "igen" }))
        ?.stingOrVenom,
    ).toBeNull()
  })
})
