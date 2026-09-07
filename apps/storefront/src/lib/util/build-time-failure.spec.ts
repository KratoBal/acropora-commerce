import { afterEach, describe, expect, it, vi } from "vitest"

import {
  boltHibanakLatszik,
  epitesiHibaMegnevezve,
} from "./build-time-failure"

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * A VALODI HIBAUZENETEK, amik ma este tenylegesen elofordultak vagy a Node
 * halozati retegebol jonnek. Nem kitalalt szovegek.
 */
describe("a bolt-kiesés felismerése", () => {
  it("felismeri a ma este mért hibákat", () => {
    expect(boltHibanakLatszik(new Error("Service Unavailable"))).toBe(true)
    expect(boltHibanakLatszik(new Error("TypeError: fetch failed"))).toBe(true)
    expect(
      boltHibanakLatszik(new Error("connect ECONNREFUSED 127.0.0.1:9000"))
    ).toBe(true)
  })

  /**
   * A NEMLEGES ESET A LÉNYEG: ha minden hibát bolt-kiesésnek neveznénk, az
   * üzenet pontosan akkor mondana valótlant, amikor tényleg a kód a hibás -- és
   * a fejlesztő a boltot nézné meg egy elgépelt mező helyett.
   */
  it("egy valódi kód-hibát NEM nevez bolt-kiesésnek", () => {
    expect(
      boltHibanakLatszik(new TypeError("Cannot read properties of undefined"))
    ).toBe(false)
    expect(boltHibanakLatszik(new Error("Invalid handle"))).toBe(false)
    expect(boltHibanakLatszik("valami szöveg")).toBe(false)
  })
})

describe("az építés-idejű hiba megnevezése", () => {
  /**
   * A BUKÁS MARAD. Ez acrobot döntése (2026-09-07 16:37) az üres listával
   * szemben: az elnyelné a valódi hibát is, és a némaság a rosszabb.
   */
  it("MINDIG továbbdobja a hibát", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const hiba = new Error("Service Unavailable")

    expect(() => epitesiHibaMegnevezve("kategoria", hiba)).toThrow(hiba)
  })

  it("bolt-kiesésnél kimondja, hogy nem a kód a hibás, és mit kell tenni", () => {
    const naplo = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() =>
      epitesiHibaMegnevezve(
        "gyujtemeny",
        new Error("fetch failed"),
        "https://pelda.hu"
      )
    ).toThrow()

    const szoveg = naplo.mock.calls.map((c) => String(c[0])).join("\n")
    expect(szoveg).toContain("A BOLT NEM VALASZOL")
    expect(szoveg).toContain("https://pelda.hu")
    expect(szoveg).toContain("EZ NEM KOD-HIBA")
    expect(szoveg).toContain("INDITSD UJRA")
    expect(szoveg).toContain("gyujtemeny")
  })

  it("kód-hibánál NEM állítja, hogy a bolt lenne az ok", () => {
    const naplo = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() =>
      epitesiHibaMegnevezve("termek", new TypeError("Cannot read properties"))
    ).toThrow()

    const szoveg = naplo.mock.calls.map((c) => String(c[0])).join("\n")
    expect(szoveg).not.toContain("A BOLT NEM VALASZOL")
    expect(szoveg).toContain("NEM a bolt elerhetetlensegere vall")
  })
})
