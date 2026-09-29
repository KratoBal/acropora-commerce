import { describe, expect, it } from "vitest"

import {
  alapertelmezettUrlapbol,
  cimCim,
  cimNevUrlapbol,
  cimSor,
  rendezettCimek,
} from "./cim"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}

/**
 * A CIM-KARTYA SZOVEGE (257:87). MI PIROSIT: ha a cim neve helyett mas all;
 * ha nev nelkul ures a cim; ha a sor nem "irsz varos, utca" alaku; ha az
 * alapertelmezett nem all elol.
 */
describe("a cím-kártya szövege", () => {
  it("a cím neve, ha van; különben a címzett, magyar sorrendben", () => {
    expect(cimCim({ address_name: " Otthon " })).toBe("Otthon")
    expect(cimCim({ first_name: "Anna", last_name: "Minta" })).toBe(
      "Minta Anna",
    )
    expect(cimCim({})).toBe("Cím")
  })

  it("egy sor: irányítószám város, utca", () => {
    expect(
      cimSor({
        postal_code: "1111",
        city: "Budapest",
        address_1: "Minta utca 12.",
        address_2: "3. em.",
      }),
    ).toBe("1111 Budapest, Minta utca 12., 3. em.")
    expect(cimSor({ city: "Budapest", address_1: "Minta utca 12." })).toBe(
      "Budapest, Minta utca 12.",
    )
  })

  it("az alapértelmezett elöl, a többi a mentés sorrendjében", () => {
    const cimek = [
      { id: "a" },
      { id: "b", is_default_shipping: true },
      { id: "c" },
    ]
    expect(rendezettCimek(cimek).map((c) => c.id)).toEqual(["b", "a", "c"])
  })
})

/**
 * AZ URLAP KET UJ MEZOJE. MI PIROSIT: ha a regi hivo (mezo nelkul) felulirja a
 * nevet vagy az alapertelmezest; ha a bejeloletlen pipa nem "false"; ha az
 * ures nev nem torol.
 */
describe("az űrlap két új mezője", () => {
  it("mező nélkül nem nyúl hozzájuk", () => {
    expect(cimNevUrlapbol(urlap({}))).toBeUndefined()
    expect(alapertelmezettUrlapbol(urlap({}), true)).toBe(true)
    expect(alapertelmezettUrlapbol(urlap({}), undefined)).toBeUndefined()
  })

  it("a név: kitöltve a név, üresen törlés (null)", () => {
    expect(cimNevUrlapbol(urlap({ address_name: " Otthon " }))).toBe("Otthon")
    expect(cimNevUrlapbol(urlap({ address_name: " " }))).toBeNull()
  })

  it("a pipa: a rejtett jelölővel együtt a bejelölés számít", () => {
    expect(
      alapertelmezettUrlapbol(
        urlap({ alapertelmezett_mezo: "1", is_default_shipping: "on" }),
        false,
      ),
    ).toBe(true)
    expect(
      alapertelmezettUrlapbol(urlap({ alapertelmezett_mezo: "1" }), true),
    ).toBe(false)
  })
})
