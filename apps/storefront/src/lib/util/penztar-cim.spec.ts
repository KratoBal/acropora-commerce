import { describe, expect, it } from "vitest"

import { orszagNev, teljesNev, varosSor } from "./penztar-cim"

describe("a pénztár címeinek megjelenítése", () => {
  it("a név magyarul vezetéknévvel kezdődik, angolul utónévvel", () => {
    expect(teljesNev("Minta", "Vevő", "hu")).toBe("Vevő Minta")
    expect(teljesNev("Minta", "Vevő", "en")).toBe("Minta Vevő")
  })

  it("hiányzó névrész nem hagy felesleges szóközt", () => {
    expect(teljesNev(null, "Vevő", "hu")).toBe("Vevő")
    expect(teljesNev("Minta", "", "en")).toBe("Minta")
  })

  it("az irányítószám és a város vessző nélkül áll", () => {
    expect(varosSor("1111", "Budapest")).toBe("1111 Budapest")
    expect(varosSor(null, "Budapest")).toBe("Budapest")
  })

  it("az ország neve az oldal nyelvén áll, a kód nem", () => {
    expect(orszagNev("hu", "hu")).toBe("Magyarország")
    expect(orszagNev("hu", "en")).toBe("Hungary")
    expect(orszagNev("", "hu")).toBe("")
  })

  it("ami nem országkód, az nagybetűsen marad, nem üres és nem dob", () => {
    expect(orszagNev("zzz9", "hu")).toBe("ZZZ9")
  })
})
