import { describe, expect, it } from "vitest"

import {
  hibaAllapota,
  kedvezmenyUzenet,
  KOD_NEM_ERVENYES,
  MOST_NEM_ELLENORIZHETO,
} from "./kedvezmeny-uzenet"

/**
 * A KÉT MONDAT SZÉTVÁLASZTÁSA.
 *
 * A lényeg nem az, hogy VAN üzenet, hanem hogy a KETTŐ KÜLÖNBÖZIK.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej cd4ff2e; minden körben 14 teszt futott le) ===
 *
 *   a két mondat UGYANAZ                      1 piros: „a két mondat nem ugyanaz"
 *   a vágás 500-nál áll, nem 400-nál          3 piros (mindhárom leképezés-szelet)
 *   a `hibaAllapota` a régi alakot is elfogadja 1 piros
 *   a komponens megint a kivételből dolgozik  1 piros
 *   a komponens nem írja ki a válasz üzenetét 1 piros
 *   a felirat visszaangolosodik               1 piros
 *
 * AZ ELSŐ KÖRNÉL HÁRMAT VÁRTAM, ÉS EGY JÖTT -- a JÓSLATOM volt rossz, nem a
 * teszt. A leképezés-szeletek a függvény kimenetét A KONSTANSHOZ mérik, tehát
 * egy konstans-csere őket nem tudja megmozdítani: a tartalom összeomlását
 * KIZÁRÓLAG a „nem ugyanaz" kontroll fogja meg. Épp ezért van ott — enélkül a
 * hat állítás egy olyan változatot is kielégítene, amiben mindkét ág ugyanazt
 * a mondatot adja, és a vevő minden hibára ugyanazt olvasná.
 */
describe("a kedvezménykód üzenete az állapotkódból következik", () => {
  it("a 4xx a KÓDRA mutat", () => {
    expect(kedvezmenyUzenet(400)).toBe(KOD_NEM_ERVENYES)
    expect(kedvezmenyUzenet(404)).toBe(KOD_NEM_ERVENYES)
    expect(kedvezmenyUzenet(422)).toBe(KOD_NEM_ERVENYES)
    expect(kedvezmenyUzenet(499)).toBe(KOD_NEM_ERVENYES)
  })

  /**
   * A MÁSIK IRÁNY, ÉS EZ A DRÁGÁBB TÉVEDÉS: egy hálózati vagy szerver-hibára
   * azt mondani, hogy „érvénytelen a kód", hazugság -- a vevő eldobna egy JÓ
   * kódot, és nem próbálná újra.
   */
  it("az 5xx és a kód nélküli hiba NEM a kódra mutat", () => {
    expect(kedvezmenyUzenet(500)).toBe(MOST_NEM_ELLENORIZHETO)
    expect(kedvezmenyUzenet(503)).toBe(MOST_NEM_ELLENORIZHETO)
    expect(kedvezmenyUzenet(undefined)).toBe(MOST_NEM_ELLENORIZHETO)
  })

  /** A HATÁROK, mert egy `>` és egy `>=` között itt egy egész válasz van. */
  it("a határok a 400 és a 499 között húzódnak", () => {
    expect(kedvezmenyUzenet(399)).toBe(MOST_NEM_ELLENORIZHETO)
    expect(kedvezmenyUzenet(400)).toBe(KOD_NEM_ERVENYES)
    expect(kedvezmenyUzenet(499)).toBe(KOD_NEM_ERVENYES)
    expect(kedvezmenyUzenet(500)).toBe(MOST_NEM_ELLENORIZHETO)
  })

  /**
   * ÉS A KÉT MONDAT TÉNYLEG KÜLÖNBÖZIK. Enélkül a fenti hat állítás egy olyan
   * változatot is kielégítene, amiben a két konstans ugyanaz a szöveg -- és
   * akkor semmit nem mérnénk, csak azt, hogy a függvény visszatér valamivel.
   */
  it("a két mondat nem ugyanaz", () => {
    expect(KOD_NEM_ERVENYES).not.toBe(MOST_NEM_ELLENORIZHETO)
  })

  /** MAGYARUL, mert a vevő látja. Az eredeti hiba épp attól volt hiba, hogy angol. */
  it("mindkét mondat magyar, és ékezetes", () => {
    expect(KOD_NEM_ERVENYES).toMatch(/[áéíóöőúüű]/)
    expect(MOST_NEM_ELLENORIZHETO).toMatch(/[áéíóöőúüű]/)
  })
})

/**
 * AZ ÁLLAPOTKÓD KIOLVASÁSA A HIBÁBÓL.
 *
 * A `@medusajs/js-sdk` `FetchError`-t dob `status` mezővel -- ezt a csomagban
 * mértem meg (`client.js`), nem feltételeztem. A repó `medusaError` segédje
 * ezzel szemben `err.response.status` alakot vár, ami a RÉGI, axios-alapú
 * kliens alakja; ezért nem arra építünk.
 */
describe("a hiba állapotkódjának kiolvasása", () => {
  it("a FetchError alakú hibából kiolvassa a státuszt", () => {
    expect(
      hibaAllapota(Object.assign(new Error("nope"), { status: 404 })),
    ).toBe(404)
  })

  /**
   * A RÉGI, axios-alakú hibából NEM olvas ki semmit, és ez nem hiányosság: ha
   * kiolvasna, azt hinnénk, hogy mindkét alakot kezeljük -- holott a mai SDK
   * sosem ilyet dob, és a „kezeljük" hite tartaná életben a `medusaError`
   * elavult ágát.
   */
  it("a régi, response-os alakból NEM olvas ki státuszt", () => {
    expect(hibaAllapota({ response: { status: 404 } })).toBeUndefined()
  })

  it("a státusz nélküli hibából és a nem-objektumból sincs kód", () => {
    expect(hibaAllapota(new Error("hálózat"))).toBeUndefined()
    expect(hibaAllapota("hálózat")).toBeUndefined()
    expect(hibaAllapota(null)).toBeUndefined()
    expect(hibaAllapota(undefined)).toBeUndefined()
  })

  /** Egy nem szám `status` nem szám: `NaN`-ból nem lesz döntés. */
  it("a nem szám státusz nem számít kódnak", () => {
    expect(hibaAllapota({ status: "nem-szam" })).toBeUndefined()
  })
})
