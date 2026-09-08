import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * AMI BETOLTODIK, ANNAK LEGYEN HIVOHELYE -- KULONBEN A VEVO FIZET ERTE SEMMIERT.
 *
 * A `layout.tsx` HAROM betutipust tolt be a `next/font`-tal, es mind a harom
 * valtozo-osztalya rakerul a gyoker `<html>` elemre. Vagyis a betu LETOLTODIK
 * minden lapbetolteskor, fuggetlenul attol, hogy renderel-e benne barmi.
 *
 * A HARMADIK (Newsreader, a hangsuly betuje) 2026-09-08-ig SEHOL nem allt: a
 * `--terv-betu-kiemelt-lanc` a `globals.css`-ben definialva volt, es NULLA
 * hivohelye volt. A betu kiment minden latogatohoz, es semmi nem jelent meg
 * benne.
 *
 * EZ SZAKADAS, NEM HOLT SULY, es a kulonbseg szamit: egy nem hasznalt token
 * torolheto; ez viszont a terv szerint HASZNALANDO, csak senki nem kotoette be.
 * A tervben ot Newsreader-elem all a kosar lapjan (nautilus merese,
 * `measurement/terv-kosar/KOSAR-SZOVEGEK.md`), negy kulon mondat, es haromnak
 * mar ott volt a szovege a kodban -- torzsbetuvel szedve.
 *
 * MIERT ALTALANOS ALAKBAN ALL, ES NEM A HAROM FAJLRA: a harom hivohely
 * ellenorzese azt merne, amit ma megirtam. Ez azt meri, ami a HIBAT letrehozta:
 * hogy egy betoltott betunek nincs hivohelye. Ha valaki holnap negyedik betut
 * vesz fel es elfelejti bekotni, ugyanez a sor szol.
 *
 * A HATARA: forrast olvas, nem megrenderelt lapot. Azt bizonyitja, hogy a
 * hivohely LETEZIK, nem azt, hogy a bongeszo tenyleg abban a betuben rajzol --
 * a kaszkadot es a betoltes sikeret nem meri. (Ugyanaz a hatar, mint a
 * `vilag-jelolo.spec.ts`-e.)
 */

const GYOKER = join(__dirname, "..")

function forrasFajlok(mappa: string): string[] {
  const talalt: string[] = []
  for (const bejegyzes of readdirSync(mappa)) {
    const ut = join(mappa, bejegyzes)
    if (statSync(ut).isDirectory()) {
      talalt.push(...forrasFajlok(ut))
      continue
    }
    if (!/\.tsx?$/.test(bejegyzes)) continue
    /**
     * A SPEC FAJLOK KIMARADNAK: ez a fajl maga is leirja a keresett
     * valtozoneveket, tehat a sajat allitasaim novelnek azt a szamot, amit
     * merni akarok.
     */
    if (/\.spec\.tsx?$/.test(bejegyzes)) continue
    talalt.push(ut)
  }
  return talalt
}

const CSS = readFileSync(join(GYOKER, "styles", "globals.css"), "utf-8")
const LAYOUT = readFileSync(join(GYOKER, "app", "layout.tsx"), "utf-8")
const FORRASOK = forrasFajlok(GYOKER).map((ut) => readFileSync(ut, "utf-8"))
/** A Tailwind-konfig: innen derul ki, melyik lanc kap utility-nevet is. */
const TAILWIND = readFileSync(join(GYOKER, "..", "tailwind.config.js"), "utf-8")

/** A `-lanc` vegu betu-tokenek: ezeket kellene hivni, nem a nyers valtozot. */
const LANC_TOKENEK = Array.from(
  CSS.matchAll(/--terv-betu-[a-z-]*lanc\b/g),
  (m) => m[0],
)

describe("a betöltött betűtípusoknak van hívóhelye", () => {
  /** ISMERT POZITIV KONTROLL: tenyleg talalunk lanc-tokeneket a stiluslapban. */
  it("a stíluslap három betű-láncot deklarál", () => {
    expect(new Set(LANC_TOKENEK).size).toBe(3)
  })

  /**
   * ES A BETOLTES OLDALA IS MERVE VAN, kulonben az allitas fele lenne: ha
   * valaki KIVESZI a betut a `layout.tsx`-bol, a lanc-token attol meg ott all,
   * es a fenti sor tovabbra is zold. Ez a sor koti ossze a kettot.
   */
  it("mindhárom betű betöltődik a layoutban", () => {
    for (const betu of ["Space_Grotesk", "JetBrains_Mono", "Newsreader"]) {
      expect(LAYOUT).toContain(betu)
    }
  })

  /**
   * A HIVOHELY KET ALAKBAN ALLHAT, ES EZ AZ ALLITAS EDDIG CSAK AZ EGYIKET
   * ISMERTE (murena merese, 2026-09-08).
   *
   *   beagyazott:  style={{ fontFamily: "var(--terv-betu-kiemelt-lanc)" }}
   *   Tailwind:    className="... font-kiemelt"
   *
   * A masodik ugyanugy hivohely: a `tailwind.config.js` a `kiemelt` nevet
   * pontosan erre a lancra kepezi le. Amikor az utolso beagyazott hasznalat
   * atkerult az osztalyra, ez a sor HAMIS PIROSAT adott -- azt allitotta, hogy
   * a Newsreadernek nulla hivohelye van, holott volt harom.
   *
   * EZ AZ ALLITAS TEHAT MIND A KET IRANYBAN HAMIS PIROSAT ADOTT VOLNA, ZOLDET
   * SOHA: egy csak-osztalyon-at hivott lancra is nullat latott. A hamis ZOLD
   * kockazata egy masik specben lakik (`szerif-egy-mechanizmus.spec.ts`): az
   * arra vigyaz, hogy a ket mechanizmus ne bujjon el egymas elol.
   *
   * A lekepezest a konfigbol olvassuk ki, nem beegetve: ha valaki atnevezi az
   * utility-t, ez a sor vele mozdul.
   */
  const OSZTALY_NEV = new Map(
    Array.from(
      TAILWIND.matchAll(/(\w+):\s*\["var\((--terv-betu-[a-z-]*lanc)\)"\]/g),
    ).map((m) => [m[2], m[1]]),
  )

  it("a Tailwind-konfig legalább egy láncot utility-ként is kiajánl", () => {
    expect(OSZTALY_NEV.size).toBeGreaterThan(0)
  })

  it.each(Array.from(new Set(LANC_TOKENEK)))(
    "%s legalább egy helyen hívva van",
    (token) => {
      const osztaly = OSZTALY_NEV.get(token)
      const hivohelyek = FORRASOK.filter(
        (forras) =>
          forras.includes(`var(${token})`) ||
          (osztaly !== undefined && forras.includes(`font-${osztaly}`)),
      ).length

      expect(hivohelyek).toBeGreaterThan(0)
    },
  )
})
