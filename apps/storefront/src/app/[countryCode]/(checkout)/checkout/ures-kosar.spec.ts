import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * AZ ÜRES KOSÁRRAL HÍVOTT PÉNZTÁR.
 *
 * === AMIT EZ MÉR, ÉS AMIT NEM ===
 *
 * A lap `@lib/data/cart`-ot importál, az pedig `server-only` -- jsdom alatt be
 * sem tölthető (ezt a repó több adatrétegénél megmértük). Amit itt mérni
 * lehet, az a FORRÁS SZÖVEGE.
 *
 * EZ GYENGÉBB ÁLLÍTÁS, mint egy viselkedés-teszt, és ki is mondom: azt méri,
 * hogy a lap az átirányítást választja és mindkét ágat nézi, nem azt, hogy a
 * böngészőben tényleg a kosárban köt ki. AZ UTÓBBIT a kiszolgált lapon mértem,
 * és a kitelepítés után ugyanazzal az eszközzel megmérem újra
 * (`agents/murena/scripts/ures-kosar-penztar.cjs`).
 *
 * === A MÉRT KIINDULÓ ÁLLAPOT (2026-09-14, kitelepített lap) ===
 *
 *   NINCS kosár (friss munkamenet)   HTTP 404, általános "Nincs ilyen oldal"
 *   VAN kosár, de ÜRES               HTTP 200, a szállítási cím űrlapja
 *   TELI kosár  (POZITÍV KONTROLL)   HTTP 200, "Szállítási cím", űrlap áll
 *
 * A második ág a kártyán nem szerepelt, és rosszabb az elsőnél: a vevő
 * nekiállhat kitölteni egy szállítási címet egy ÜRES rendeléshez.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej f4c3408; minden körben 9 teszt futott le) ===
 *
 *   megint `notFound()`                    2 piros
 *   csak a `!cart` ágat nézi               1 piros
 *   az országkód beégetve (`/hu/cart`)     1 piros
 *   a lap címe visszaangolosodik           1 piros
 *
 * Az elsőnél KETTŐT VAGY HÁRMAT vártam, és a bizonytalanságot a jóslatban
 * kimondtam: a `countryCode` szó a paraméter-típusban akkor is ottmarad, ha az
 * átirányítás eltűnik, tehát az a szelet zöld maradhat. Kettő jött.
 */
const kod = (() => {
  const nyers = readFileSync(join(__dirname, "page.tsx"), "utf8")
  /* A megjegyzéseket kiszedjük, különben a SAJÁT magyarázó szövegünk lenne a
     találat -- a repó máshol is ezt az alakot használja. */
  return nyers.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
})()

describe("az üres kosárral hívott pénztár", () => {
  /** ISMERT POZITÍV KONTROLL: a fájlt tényleg beolvastuk, és ez a pénztár lapja. */
  it("a forrás olvasható, és tényleg a pénztár lapja", () => {
    expect(kod).toContain("export default async function Checkout")
    expect(kod).toContain("retrieveCart")
  })

  /**
   * A 404 A ROSSZ VÁLASZ, ÉS NEM ÍZLÉS KÉRDÉSE: a pénztár-lap LÉTEZIK, csak
   * nincs mit fizetni. A 404 azt mondja a vevőnek (és a keresőnek), hogy rossz
   * helyen jár -- holott jó helyen jár.
   */
  it("nem 404-gyel válaszol", () => {
    expect(kod).not.toContain("notFound")
  })

  it("a kosár lapjára irányít át", () => {
    expect(kod).toContain("redirect(")
    expect(kod).toMatch(/\/cart/)
  })

  /**
   * MINDKÉT ÁG, ÉS EZ A LÉNYEG. A kártya csak a kosár NÉLKÜLI esetet ismerte;
   * a mérésem szerint a LÉTEZŐ, de ÜRES kosár 200-zal a szállítási cím
   * űrlapjára vitt. Egy javítás, ami csak a `!cart` ágat nézi, a rosszabbik
   * felét csendben meghagyná.
   */
  it("a hiányzó ÉS az üres kosarat is nézi", () => {
    expect(kod).toContain("!cart")
    expect(kod).toMatch(/items\?\.length/)
  })

  /**
   * AZ ORSZÁGKÓD AZ ÚTVONALBÓL JÖN, nem beégetve. Egy rögzített `/hu/cart` a
   * többi ország vevőjét átvinné a magyar boltba -- és ez nem hibázna, csak
   * mást mutatna.
   */
  it("az átirányítás az útvonal országkódját használja", () => {
    expect(kod).toContain("countryCode")
    expect(kod).not.toMatch(/redirect\(`\/hu\//)
  })

  /** A böngésző fülén a vevő olvassa, tehát magyar. */
  it("a lap címe magyar", () => {
    expect(kod).toContain('title: "Pénztár"')
  })
})
