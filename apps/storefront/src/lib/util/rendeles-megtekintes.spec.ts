import { describe, expect, it } from "vitest"

import {
  MEGTEKINTES_ELETTARTAM_MP,
  alairtMegtekintesSuti,
  megtekintesEngedelyezett,
  sutiPar,
} from "./rendeles-megtekintes"

/**
 * A MEGTEKINTESI SUTI (audit P1/5). MI PIROSIT: ha az azonosito alairas nelkul
 * is eleg (egy kitalalt vagy atirt suti atmegy); ha egy masik kulccsal
 * alairt suti atmegy; ha egy lejart suti atmegy; ha a suti egy MASIK
 * rendelest nyit meg, mint amit megnevez; ha titok nelkul is van suti.
 */
const KULCS = "proba-titok-nem-valodi"
const MOST = new Date("2026-10-27T12:00:00.000Z")
const KESOBB = (mp: number) => new Date(MOST.getTime() + mp * 1000)

describe("a megtekintési süti", () => {
  it("a megnevezett rendeléseket nyitja meg, mást nem", () => {
    const suti = alairtMegtekintesSuti(["order_A", "order_B"], MOST, KULCS)!
    expect(megtekintesEngedelyezett(suti, "order_A", MOST, KULCS)).toBe(true)
    expect(megtekintesEngedelyezett(suti, "order_B", MOST, KULCS)).toBe(true)
    expect(megtekintesEngedelyezett(suti, "order_C", MOST, KULCS)).toBe(false)
  })

  it("lejár az élettartam után, előtte nem", () => {
    const suti = alairtMegtekintesSuti(["order_A"], MOST, KULCS)!
    expect(
      megtekintesEngedelyezett(
        suti,
        "order_A",
        KESOBB(MEGTEKINTES_ELETTARTAM_MP - 1),
        KULCS,
      ),
    ).toBe(true)
    expect(
      megtekintesEngedelyezett(
        suti,
        "order_A",
        KESOBB(MEGTEKINTES_ELETTARTAM_MP + 1),
        KULCS,
      ),
    ).toBe(false)
  })

  it("az átírt azonosító-lista és az átírt lejárat nem megy át", () => {
    const [lejarat, idk, alairas] = alairtMegtekintesSuti(
      ["order_A"],
      MOST,
      KULCS,
    )!.split(".")
    expect(
      megtekintesEngedelyezett(
        `${lejarat}.order_A,order_X.${alairas}`,
        "order_X",
        MOST,
        KULCS,
      ),
    ).toBe(false)
    expect(
      megtekintesEngedelyezett(
        `${Number(lejarat) + 99999}.${idk}.${alairas}`,
        "order_A",
        MOST,
        KULCS,
      ),
    ).toBe(false)
  })

  it("másik kulccsal aláírt, aláírás nélküli és rossz alakú süti nem megy át", () => {
    const masik = alairtMegtekintesSuti(["order_A"], MOST, "masik-titok")!
    expect(megtekintesEngedelyezett(masik, "order_A", MOST, KULCS)).toBe(false)
    const expiry = Math.floor(MOST.getTime() / 1000) + 600
    for (const suti of [
      `${expiry}.order_A.`,
      `${expiry}.order_A`,
      "order_A",
      "",
      undefined,
      null,
      "a.b.c.d",
    ]) {
      expect(megtekintesEngedelyezett(suti, "order_A", MOST, KULCS)).toBe(false)
    }
  })

  it("a puszta azonosító nem suti: az URL ismerete nem elég", () => {
    expect(megtekintesEngedelyezett("order_A", "order_A", MOST, KULCS)).toBe(
      false,
    )
  })

  it("titok nélkül nincs suti, és nincs engedély sem", () => {
    expect(alairtMegtekintesSuti(["order_A"], MOST, null)).toBeNull()
    expect(alairtMegtekintesSuti(["order_A"], MOST, "")).toBeNull()
    const suti = alairtMegtekintesSuti(["order_A"], MOST, KULCS)!
    expect(megtekintesEngedelyezett(suti, "order_A", MOST, null)).toBe(false)
  })

  it("üres vagy furcsa azonosítóból nem lesz süti (a pont és a vessző elválasztó)", () => {
    expect(alairtMegtekintesSuti([], MOST, KULCS)).toBeNull()
    expect(alairtMegtekintesSuti(["a.b", "x,y", ""], MOST, KULCS)).toBeNull()
  })
})

/**
 * A VEGYES KOSAR PARJA A SUTIBOL (kartya d0d177a6). MI PIROSIT: ha a kiszallitott
 * rendeles lapja nem a bolti part kapja (vagy forditva); ha egy rendeles parja
 * egy olyan sutibol jon, ami nem ket rendelest nevez meg, ami nem nevezi meg ezt
 * a rendelest, ami lejart, vagy amit nem ez a kulcs irt alá.
 */
describe("a vegyes kosár párja a sütiből", () => {
  const ket = () =>
    alairtMegtekintesSuti(["order_SHIP", "order_PICK"], MOST, KULCS)!

  it("a kiszállított rendelés párja a bolti, a boltié a kiszállított", () => {
    expect(sutiPar(ket(), "order_SHIP", MOST, KULCS)).toEqual({
      id: "order_PICK",
      bolti: true,
    })
    expect(sutiPar(ket(), "order_PICK", MOST, KULCS)).toEqual({
      id: "order_SHIP",
      bolti: false,
    })
  })

  it("egy rendelés, idegen rendelés, lejárt vagy más kulccsal írt süti: nincs pár", () => {
    expect(
      sutiPar(
        alairtMegtekintesSuti(["order_SHIP"], MOST, KULCS),
        "order_SHIP",
        MOST,
        KULCS,
      ),
    ).toBeNull()
    expect(sutiPar(ket(), "order_MASIK", MOST, KULCS)).toBeNull()
    expect(
      sutiPar(
        ket(),
        "order_SHIP",
        KESOBB(MEGTEKINTES_ELETTARTAM_MP + 1),
        KULCS,
      ),
    ).toBeNull()
    expect(sutiPar(ket(), "order_SHIP", MOST, "masik-kulcs")).toBeNull()
    expect(sutiPar(undefined, "order_SHIP", MOST, KULCS)).toBeNull()
  })
})
