import { describe, expect, it } from "vitest"

import {
  ervenyesRumTorzs,
  RUM_MAX_BAJT,
  rumArany,
  rumErtek,
  rumLaptipus,
} from "./rum"

/**
 * A RUM SZABALYAI (FE-7). MI PIROSIT: ha egy fizetesi token vagy rendeles-
 * azonosito utvonala a sajat tipusa helyett barmi masnak latszana; ha a
 * vegpont ismeretlen mezot vagy ertelmetlen erteket fogadna el (akkor a
 * naploba kivulrol tetszoleges szoveg kerulhetne); ha a mintavetel hibas
 * ertekre kikapcsolna.
 */
describe("rumLaptipus", () => {
  it.each([
    ["/hu", "kezdolap"],
    ["/hu/termek/dupla-marin-so", "termek"],
    ["/hu/categories/termekek/eledelek", "kategoria"],
    ["/hu/collections/easyphyt", "gyujtemeny"],
    ["/hu/store", "osszes-termek"],
    ["/hu/jogi/aszf", "jogi"],
    ["/hu/cart", "kosar"],
    ["/hu/checkout", "penztar"],
    ["/hu/account/orders", "fiok"],
    ["/hu/order/order_01ABC/confirmed", "rendeles"],
    ["/hu/rendeles-fizetese/titkos-token-123", "rendeles"],
    ["/hu/_p/2/categories/x", "kategoria"],
    ["/hu/_szurt/store", "osszes-termek"],
    ["/hu/hamarosan/akvarium", "egyeb"],
  ])("%s -> %s", (utvonal, tipus) => {
    expect(rumLaptipus(utvonal)).toBe(tipus)
  })
})

describe("ervenyesRumTorzs", () => {
  const jo = { n: "LCP", v: 2140, r: "good", t: "termek" }

  it("elfogadja az ismert mezőket ismert értékkel", () => {
    expect(ervenyesRumTorzs(jo)).toEqual(jo)
    expect(ervenyesRumTorzs({ ...jo, n: "CLS", v: 0.0213 })).not.toBeNull()
  })

  it("elutasít minden mást", () => {
    for (const rossz of [
      null,
      [],
      "LCP",
      { ...jo, u: "https://shop.example/hu/rendeles-fizetese/titok" },
      { ...jo, n: "FID" },
      { ...jo, r: "kivalo" },
      { ...jo, t: "/hu/termek/x" },
      { ...jo, v: Number.NaN },
      { ...jo, v: -1 },
      { ...jo, v: "2140" },
      { ...jo, v: 10_000_000 },
      { ...jo, n: "CLS", v: 11 },
    ])
      expect(ervenyesRumTorzs(rossz), JSON.stringify(rossz)).toBeNull()
  })

  it("egy érvényes törzs jóval a bájt-korlát alatt marad", () => {
    expect(JSON.stringify(jo).length).toBeLessThan(RUM_MAX_BAJT / 4)
  })
})

describe("rumErtek és rumArany", () => {
  it("a CLS négy tizedes, a többi egész ms", () => {
    expect(rumErtek("CLS", 0.123456)).toBe(0.1235)
    expect(rumErtek("LCP", 2140.7)).toBe(2141)
  })

  it("a mintavételi arány 0 és 1 közé szorul, hibás értékre 1", () => {
    expect(rumArany(undefined)).toBe(1)
    expect(rumArany("")).toBe(1)
    expect(rumArany("abc")).toBe(1)
    expect(rumArany("0")).toBe(0)
    expect(rumArany("0.25")).toBe(0.25)
    expect(rumArany("5")).toBe(1)
    expect(rumArany("-1")).toBe(0)
  })
})
