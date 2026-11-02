import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A NEV-TERKEP BEKOTESE A LAPTOL A MORZSAMENUIG -- SZOVEGBOL MERVE, ES
 * KIMONDOM, MIERT EPP IGY.
 *
 * A `templates/index.tsx` `server-only` kodot huz be az adatlekero gyerekein
 * at, tehat jsdom alatt NEM importalhato. Vagyis a KOMPONENS viselkedeset
 * merni tudjuk, a kozotte levo bekotest nem.
 *
 * Ezt a rest a kalibracio mutatta meg: a `nevek` prop elhagyasa a morzsamenu
 * hivasabol NULLA pirosat adott (merve 2026-09-09), tehat a lap csendben
 * visszaeshetne a feltetel nelkuli vagasra. 2026-11-01 ota a morzsamenut az
 * oldal maga rajzolja (`commerce/kategoria-lap.tsx`), a regi kulon
 * morzsamenu-fajl megszunt.
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A JELOLEST meri, nem a viselkedest: azt, hogy a hivas atadja a terkepet. Azt
 * nem tudja megmondani, hogy a terkep helyes-e -- arrol a szabaly sajat
 * specje (`kategoria-fa.spec.ts`) szol.
 *
 * A KOMMENTEKET KI KELL SZEDNI, es ez nem elmeleti: ez a fajl maga is idezi a
 * keresett alakot a fenti magyarazatban. Kommentek nelkul a meres a KODRA
 * megy, nem a fajl szovegere.
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const olvas = (nev: string) =>
  kodSzoveg(readFileSync(join(__dirname, nev), "utf-8"))

describe("a név-térkép bekötése", () => {
  it("a kategória-lap sablonja átadja a térképet az oldalnak", () => {
    const kod = olvas("index.tsx")

    expect(kod).toMatch(/<CommerceKategoriaLap[^>]*\bnevek=\{nevek\}/)
  })

  /**
   * ISMERT POZITIV KONTROLL: a keresett elem egyaltalan ott van a fajlban. Egy
   * nulla talalat enelkul ugyanugy nezne ki akkor is, ha valaki atnevezi a
   * komponenst -- es akkor nem a bekotes hianyzana, hanem a kerdesem lenne
   * rossz.
   */
  it("az oldal hívása egyáltalán ott áll a sablonban", () => {
    expect(olvas("index.tsx")).toContain("<CommerceKategoriaLap")
  })

  /**
   * ES A MASIK VEG: az oldal FOGADJA is a propot. A ket allitas kulon
   * romolhat el -- egy atadott prop, amit a fogado nem ismer, csendben elvesz.
   */
  it("az oldal fogadja a térképet", () => {
    expect(olvas("commerce/kategoria-lap.tsx")).toMatch(
      /nevek\?:\s*Map<string,\s*string>/,
    )
  })
})
