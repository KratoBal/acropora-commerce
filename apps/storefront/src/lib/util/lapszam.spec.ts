import { describe, expect, it } from "vitest"

import { csakLapszam, lapszamLetezik } from "./lapszam"

/*
  A NEM LETEZO LAPSZAM (FE-7 3. resz, barracuda 2. lelet). MI PIROSIT: az
  utolso lap utani lapszam letezonek szamit (soft 404, uj ISR-bejegyzes); az
  utolso lap nem letezonek (eltunik egy valodi lap); az ures lista 1. lapja 404;
  a szurt keres (dinamikus) is ellenorzest kap, vagy a lapozott nem.
*/
describe("létezik-e a lapszám", () => {
  it("25 termék, 12-es lap: 3 lap van", () => {
    expect(lapszamLetezik(3, 25, 12)).toBe(true)
    expect(lapszamLetezik(4, 25, 12)).toBe(false)
  })

  it("pontos többszörösnél nincs üres utolsó lap", () => {
    expect(lapszamLetezik(2, 24, 12)).toBe(true)
    expect(lapszamLetezik(3, 24, 12)).toBe(false)
  })

  it("üres listánál az 1. lap létezik, a 2. nem", () => {
    expect(lapszamLetezik(1, 0, 12)).toBe(true)
    expect(lapszamLetezik(2, 0, 12)).toBe(false)
  })
})

describe("csak lapszám van-e a kérésben", () => {
  it("a lapozott kérés a lapszámot adja", () => {
    expect(csakLapszam({ page: "3" })).toBe(3)
  })

  it("szűrővel, első lappal vagy lapszám nélkül nincs ellenőrzés", () => {
    expect(csakLapszam({ page: "3", sortBy: "price_asc" })).toBeNull()
    expect(csakLapszam({ page: "1" })).toBeNull()
    expect(csakLapszam({})).toBeNull()
  })
})
