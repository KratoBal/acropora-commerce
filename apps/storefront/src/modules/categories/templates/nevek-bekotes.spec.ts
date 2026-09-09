import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A NEV-TERKEP BEKOTESE A LAPTOL A MORZSAMENUIG -- SZOVEGBOL MERVE, ES
 * KIMONDOM, MIERT EPP IGY.
 *
 * A `templates/index.tsx` `server-only` kodot huz be az adatlekero gyerekein
 * at, tehat jsdom alatt NEM importalhato -- ezert kellett a morzsamenut kulon
 * fajlba emelni. Vagyis a KOMPONENSEK viselkedeset merni tudjuk, a KOZOTTUK
 * levo bekotest nem.
 *
 * Ezt a rest a kalibracio mutatta meg: a `nevek` prop elhagyasa a
 * `<Breadcrumbs ...>` hivasabol NULLA pirosat adott (merve 2026-09-09), tehat
 * a lap csendben visszaeshetne a feltetel nelkuli vagasra.
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
  it("a kategória-lap sablonja átadja a térképet a morzsamenünek", () => {
    const kod = olvas("index.tsx")

    expect(kod).toMatch(/<Breadcrumbs[^>]*\bnevek=\{nevek\}/)
  })

  /**
   * ISMERT POZITIV KONTROLL: a keresett elem egyaltalan ott van a fajlban. Egy
   * nulla talalat enelkul ugyanugy nezne ki akkor is, ha valaki atnevezi a
   * komponenst -- es akkor nem a bekotes hianyzana, hanem a kerdesem lenne
   * rossz.
   */
  it("a morzsamenü hívása egyáltalán ott áll a sablonban", () => {
    expect(olvas("index.tsx")).toContain("<Breadcrumbs")
  })

  /**
   * ES A MASIK VEG: a morzsamenu FOGADJA is a propot. A ket allitas kulon
   * romolhat el -- egy atadott prop, amit a fogado nem ismer, csendben elvesz.
   */
  it("a morzsamenü fogadja a térképet", () => {
    expect(olvas("category-breadcrumbs.tsx")).toMatch(
      /nevek\?:\s*Map<string,\s*string>/,
    )
  })
})
