import { describe, expect, it } from "vitest"

import {
  SIMPLEPAY_FUGGOBEN,
  SIMPLEPAY_IDOTULLEPES,
  SIMPLEPAY_KOSAR_MEGMARADT,
  SIMPLEPAY_MEGSZAKITVA,
  SIMPLEPAY_NEM_ELLENORIZHETO,
  SIMPLEPAY_RENDELES_FOLYAMATBAN,
  SIMPLEPAY_SIKERES,
  SIMPLEPAY_SIKERTELEN,
  SIMPLEPAY_SIKERTELEN_TEENDO,
  simplePayEredmeny,
  tranzakcioAzR,
} from "./simplepay-eredmeny"

/**
 * A SIMPLEPAY VISSZATERES SZOVEGEI (3.13). MI PIROSIT: megszakitasnal vagy
 * idotullepesnel tranzakcio-azonosito vagy "sikertelen" szo; sikertelen
 * fizetesnel hianyzo azonosito vagy teendo; az esemenybol (nem a hatter
 * dontesebol) szarmazo siker.
 */
describe("a SimplePay visszatérés szövegei", () => {
  it("sikeres fizetés: az azonosító és a rendelés", () => {
    expect(
      simplePayEredmeny(
        { event: "SUCCESS", status: "paid", order_ids: ["order_1", "order_2"] },
        "501234567",
      ),
    ).toEqual({
      cim: SIMPLEPAY_SIKERES,
      sorok: [],
      tranzakcio: "501234567",
      rendelesId: "order_1",
      vissza: false,
    })
    expect(
      simplePayEredmeny(
        { event: "SUCCESS", status: "paid", order_ids: [] },
        "5",
      ).sorok,
    ).toEqual([SIMPLEPAY_RENDELES_FOLYAMATBAN])
  })

  it("megszakítás és időtúllépés: nincs azonosító, nincs sikertelen szó, a kosár megmaradt", () => {
    for (const [event, cim] of [
      ["CANCEL", SIMPLEPAY_MEGSZAKITVA],
      ["TIMEOUT", SIMPLEPAY_IDOTULLEPES],
    ] as const) {
      const e = simplePayEredmeny({ event, status: "not_paid" }, "501234567")
      expect(e).toEqual({
        cim,
        sorok: [SIMPLEPAY_KOSAR_MEGMARADT],
        tranzakcio: null,
        rendelesId: null,
        vissza: true,
      })
      expect([e.cim, ...e.sorok].join(" ")).not.toMatch(/sikertelen/i)
    }
  })

  it("sikertelen fizetés: az azonosító és a teendő, az ok nélkül", () => {
    const e = simplePayEredmeny(
      { event: "FAIL", status: "not_paid" },
      "501234567",
    )
    expect(e.cim).toBe(SIMPLEPAY_SIKERTELEN)
    expect(e.tranzakcio).toBe("501234567")
    expect(e.sorok).toEqual([
      SIMPLEPAY_SIKERTELEN_TEENDO,
      SIMPLEPAY_KOSAR_MEGMARADT,
    ])
  })

  it("a siker a háttér döntése, nem az eseményé; függő és ellenőrizhetetlen eredmény nem ígér semmit", () => {
    expect(
      simplePayEredmeny({ event: "SUCCESS", status: "pending" }, "5"),
    ).toMatchObject({
      sorok: [SIMPLEPAY_FUGGOBEN],
      tranzakcio: null,
      rendelesId: null,
    })
    expect(simplePayEredmeny(null, "5")).toMatchObject({
      sorok: [SIMPLEPAY_NEM_ELLENORIZHETO],
      tranzakcio: null,
    })
  })

  it("a tranzakció azonosítója az r mezőből, csak szám", () => {
    const r = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64")
    expect(tranzakcioAzR(r({ t: 501234567 }))).toBe("501234567")
    expect(tranzakcioAzR(r({ t: "<script>" }))).toBeNull()
    expect(tranzakcioAzR("nem-base64-json")).toBeNull()
    expect(tranzakcioAzR(undefined)).toBeNull()
  })
})
