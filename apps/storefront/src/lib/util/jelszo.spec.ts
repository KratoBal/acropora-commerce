import { describe, expect, it } from "vitest"

import {
  JELSZO_MIN_HOSSZ,
  JELSZO_ROVID_UZENET,
  jelszoCsereHiba,
  jelszoHosszuEleg,
} from "./jelszo"

/**
 * A JELSZO MINIMALIS HOSSZA (audit P1/8). MI PIROSIT: ha egy rovid uj jelszo
 * atmegy a cserenel; ha a hatar nem tiz karakternel van; ha a bajtot szamoljuk
 * karakter helyett (az ekezetes betu ketto lenne); ha a jelenlegi jelszora is
 * hossz-szabaly vonatkozik (a regi, rovid jelszavu fiok nem tudna cserelni).
 */
describe("a jelszó hossza", () => {
  it("tíz karaktertől elég, kilenc nem", () => {
    expect(JELSZO_MIN_HOSSZ).toBe(10)
    expect(jelszoHosszuEleg("123456789")).toBe(false)
    expect(jelszoHosszuEleg("1234567890")).toBe(true)
  })

  it("karaktert számol, nem bajtot", () => {
    // kilenc ekezetes betu: tizennyolc bajt, de kilenc karakter
    expect(jelszoHosszuEleg("ááááááááá")).toBe(false)
    expect(jelszoHosszuEleg("áááááááááá")).toBe(true)
  })

  it("nem szöveg vagy üres nem elég", () => {
    for (const ertek of [null, undefined, "", 1234567890, {}]) {
      expect(jelszoHosszuEleg(ertek)).toBe(false)
    }
  })
})

describe("a jelszócsere ellenőrzése", () => {
  const jo = { jelenlegi: "regi", uj: "uj-jelszo-1", ujUjra: "uj-jelszo-1" }

  it("rövid új jelszóval megáll, a rövid JELENLEGI jelszóval nem", () => {
    expect(jelszoCsereHiba(jo)).toBeNull()
    expect(jelszoCsereHiba({ ...jo, uj: "rovid", ujUjra: "rovid" })).toBe(
      JELSZO_ROVID_UZENET,
    )
  })

  it("a meglévő hibák sorrendje marad: üres mező, eltérő jelszó, aztán a hossz", () => {
    expect(jelszoCsereHiba({ ...jo, jelenlegi: "" })).toBe(
      "Mindhárom mező kitöltése kötelező.",
    )
    expect(jelszoCsereHiba({ ...jo, ujUjra: "mas" })).toBe(
      "A két új jelszó nem egyezik.",
    )
  })
})
