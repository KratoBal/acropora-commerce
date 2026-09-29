import { describe, expect, it } from "vitest"

import {
  adoszamEgysegesitve,
  szamlazasiHiba,
  torzsszamRendben,
} from "./szamlazas"

/*
 * KITALALT, KEZZEL SZAMOLT TORZSSZAMOK (nem valodi cegek, es nem a vizsgalt
 * fuggvenny generalta oket, hogy a teszt ne onmagat igazolja):
 *   1234567 -> 9+14+9+4+45+42+21 = 144, (10 - 4) % 10 = 6 -> 12345676
 *   2345678 -> 18+21+12+5+54+49+24 = 183, (10 - 3) % 10 = 7 -> 23456787
 */
const JO_A = "12345676"
const JO_B = "23456787"

describe("a törzsszám ellenőrző számjegye", () => {
  it("két kézzel számolt számot elfogad, egy elrontottat nem", () => {
    expect(torzsszamRendben(JO_A)).toBe(true)
    expect(torzsszamRendben(JO_B)).toBe(true)
    expect(torzsszamRendben("12345677")).toBe(false)
    expect(torzsszamRendben("1234567")).toBe(false)
  })
})

/**
 * AZ ADOSZAM EGYSEGESITESE. MI PIROSIT: ha kotojel vagy szokoz nelkul
 * elutasit; ha rossz ellenorzo szamjegyet, 0 vagy 6 afakodot, 10 szamjegyet
 * vagy HU elotagot elfogad; ha nem kotojelesen tarol.
 */
describe("az adószám egységesítése", () => {
  it("kötőjellel, szóközzel vagy anélkül ugyanaz a tárolt alak", () => {
    expect(adoszamEgysegesitve(`${JO_A}-2-13`)).toBe(`${JO_A}-2-13`)
    expect(adoszamEgysegesitve(`${JO_A} 2 13`)).toBe(`${JO_A}-2-13`)
    expect(adoszamEgysegesitve(`${JO_B}542`)).toBe(`${JO_B}-5-42`)
  })

  it("rossz ellenőrző számjegy, áfakód, hossz vagy HU előtag: nem adószám", () => {
    expect(adoszamEgysegesitve("12345677-2-13")).toBeNull()
    expect(adoszamEgysegesitve(`${JO_A}-0-13`)).toBeNull()
    expect(adoszamEgysegesitve(`${JO_A}-6-13`)).toBeNull()
    expect(adoszamEgysegesitve(`${JO_A}-2-1`)).toBeNull()
    expect(adoszamEgysegesitve(`HU${JO_A}`)).toBeNull()
  })
})

describe("a számlázási űrlap szabályai", () => {
  const CIM = {
    iranyitoszam: "1111",
    varos: "Budapest",
    utca: "Minta utca 12.",
  }

  it("magánszemélynél cég és adószám nélkül menthető", () => {
    expect(
      szamlazasiHiba({ tipus: "maganszemely", ceg: "", adoszam: "", ...CIM }),
    ).toBeNull()
  })

  it("a cím mezői kötelezők, az irányítószám négy számjegy", () => {
    expect(
      szamlazasiHiba({
        tipus: "maganszemely",
        ceg: "",
        adoszam: "",
        ...CIM,
        varos: "",
      }),
    ).toContain("kötelező")
    expect(
      szamlazasiHiba({
        tipus: "maganszemely",
        ceg: "",
        adoszam: "",
        ...CIM,
        iranyitoszam: "111",
      }),
    ).toBe("Az irányítószám négy számjegy.")
  })

  it("cégnél a cégnév és az érvényes adószám kötelező, a két hiba külön mondat", () => {
    expect(
      szamlazasiHiba({
        tipus: "ceg",
        ceg: "",
        adoszam: `${JO_A}-2-13`,
        ...CIM,
      }),
    ).toContain("cégnév")
    expect(
      szamlazasiHiba({
        tipus: "ceg",
        ceg: "Minta Kft.",
        adoszam: "123",
        ...CIM,
      }),
    ).toBe("Az adószámot 12345678-1-23 alakban add meg.")
    expect(
      szamlazasiHiba({
        tipus: "ceg",
        ceg: "Minta Kft.",
        adoszam: "12345677-2-13",
        ...CIM,
      }),
    ).toContain("ellenőrző számjegye")
    expect(
      szamlazasiHiba({
        tipus: "ceg",
        ceg: "Minta Kft.",
        adoszam: `${JO_A}-2-13`,
        ...CIM,
      }),
    ).toBeNull()
  })
})
