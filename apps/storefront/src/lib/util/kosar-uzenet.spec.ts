import { describe, expect, it } from "vitest"

import {
  KOSAR_MOST_NEM_SIKERULT,
  MENNYISEG_ELUTASITVA,
  kosarUzenet,
} from "./kosar-uzenet"
import { KOD_NEM_ERVENYES } from "./kedvezmeny-uzenet"

/**
 * A KOSÁR KÉT MONDATA, ÉS AMIÉRT KÜLÖN ÁLLNAK A KEDVEZMÉNYKÓDÉTÓL.
 *
 * A vágás ugyanaz (4xx kontra minden más), a MONDATOK viszont nem lehetnek
 * ugyanazok: a kedvezménykódnál a beírt KÓD a gyanús, itt a kért MENNYISÉG.
 * Aki a kosárban azt olvasná, hogy „ez a kedvezménykód nem érvényes", nem
 * tudná, mit csináljon.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej ef7b4e0; minden körben 11 teszt futott le) ===
 *
 * A jóslat FÁJLBAN állt a futtatás előtt
 * (`agents/murena/scripts/joslat-kosar-hiba.md`), a cáfolati feltételekkel
 * együtt. Öt körből öt egyezett.
 *
 *   a vágás 500-nál áll, nem 400-nál          2 piros (4xx-szelet, határok)
 *   a két konstans UGYANAZ a szöveg           1 piros („a két mondat nem ugyanaz")
 *
 * A MÁSODIKHOZ ELŐSZÖR HÁRMAT ÍRTAM, és a futtatás ELŐTT javítottam ki egyre.
 * A leképezés-szeletek a függvény kimenetét A KONSTANSHOZ mérik, tehát egy
 * összeomlott konstans-pár őket nem tudja megmozdítani -- KIZÁRÓLAG a „nem
 * ugyanaz" kontroll fogja meg. Ugyanezt a tévedést a `kedvezmeny-uzenet.spec.ts`
 * fejléce már egyszer rögzítette, egy fájllal odébb.
 */
describe("a kosár üzenete az állapotkódból következik", () => {
  it("a 4xx a kért MENNYISÉGRE mutat", () => {
    expect(kosarUzenet(400)).toBe(MENNYISEG_ELUTASITVA)
    expect(kosarUzenet(409)).toBe(MENNYISEG_ELUTASITVA)
    expect(kosarUzenet(422)).toBe(MENNYISEG_ELUTASITVA)
  })

  /**
   * A MÁSIK IRÁNY, ÉS UGYANÚGY EZ A DRÁGÁBB TÉVEDÉS: egy hálózati hibára azt
   * mondani, hogy „próbálj kevesebbet", elküldi a vevőt egy olyan úton, ami
   * nem vezet sehova -- kevesebbel is ugyanaz történne.
   */
  it("az 5xx és a kód nélküli hiba NEM a mennyiségre mutat", () => {
    expect(kosarUzenet(500)).toBe(KOSAR_MOST_NEM_SIKERULT)
    expect(kosarUzenet(503)).toBe(KOSAR_MOST_NEM_SIKERULT)
    expect(kosarUzenet(undefined)).toBe(KOSAR_MOST_NEM_SIKERULT)
  })

  it("a határok a 400 és a 499 között húzódnak", () => {
    expect(kosarUzenet(399)).toBe(KOSAR_MOST_NEM_SIKERULT)
    expect(kosarUzenet(400)).toBe(MENNYISEG_ELUTASITVA)
    expect(kosarUzenet(499)).toBe(MENNYISEG_ELUTASITVA)
    expect(kosarUzenet(500)).toBe(KOSAR_MOST_NEM_SIKERULT)
  })

  /**
   * ISMERT POZITÍV KONTROLL: a két mondat tényleg különbözik. Enélkül a fenti
   * tíz állítást egy olyan változat is kielégítené, amiben a két konstans
   * ugyanaz a szöveg, és a vevő minden hibára ugyanazt olvasná.
   */
  it("a két mondat nem ugyanaz", () => {
    expect(MENNYISEG_ELUTASITVA).not.toBe(KOSAR_MOST_NEM_SIKERULT)
  })

  /**
   * ÉS NEM IS A KEDVEZMÉNYKÓD MONDATA. Ez nem szőrszálhasogatás: a két modul
   * ugyanazt a vágást használja, tehát a legkézenfekvőbb „egyszerűsítés" az
   * lenne, hogy a kosár is a kedvezménykód szövegét kapja. A vevő ettől a
   * rossz dolgot javítaná.
   */
  it("a kosár nem a kedvezménykód mondatát adja", () => {
    expect(MENNYISEG_ELUTASITVA).not.toBe(KOD_NEM_ERVENYES)
  })

  /** MAGYARUL, mert a vevő látja. Az eredeti hiba épp attól volt hiba, hogy angol. */
  it("mindkét mondat magyar, és ékezetes", () => {
    expect(MENNYISEG_ELUTASITVA).toMatch(/[áéíóöőúüű]/)
    expect(KOSAR_MOST_NEM_SIKERULT).toMatch(/[áéíóöőúüű]/)
  })
})
