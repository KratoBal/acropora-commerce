import { describe, expect, it } from "vitest"

import { megjegyzesekKosarbol, megjegyzesValtozas } from "./megjegyzes"

describe("megjegyzesValtozas", () => {
  const tarolt = { vevo: "Délután", futar: "Kapukód 12" }

  it("csak a megváltozott mező megy, a szóköz nem változás", () => {
    expect(
      megjegyzesValtozas(
        tarolt,
        { vevo: " Délután ", futar: "Kapukód 12" },
        true,
      ),
    ).toBeNull()
    expect(
      megjegyzesValtozas(tarolt, { vevo: "Reggel", futar: "Kapukód 12" }, true),
    ).toEqual({ customer_note: "Reggel" })
  })

  it("az üres mező törlés (null)", () => {
    expect(
      megjegyzesValtozas(tarolt, { vevo: "", futar: "Kapukód 12" }, true),
    ).toEqual({ customer_note: null })
  })

  it("nem házhoz szállításnál a futár-üzenet törlődik, akármi áll a mezőben", () => {
    expect(megjegyzesValtozas(tarolt, tarolt, false)).toEqual({
      carrier_note: null,
    })
    expect(
      megjegyzesValtozas(
        { vevo: "", futar: "" },
        { vevo: "", futar: "valami" },
        false,
      ),
    ).toBeNull()
  })
})

describe("megjegyzesekKosarbol", () => {
  it("csak szöveget olvas", () => {
    expect(
      megjegyzesekKosarbol({
        acropora_customer_note: "x",
        acropora_carrier_note: 5,
      }),
    ).toEqual({ vevo: "x", futar: "" })
    expect(megjegyzesekKosarbol(null)).toEqual({ vevo: "", futar: "" })
  })
})
