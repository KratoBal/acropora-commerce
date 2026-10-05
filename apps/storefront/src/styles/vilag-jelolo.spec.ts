import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * KI DONTI EL, MELYIK VILAGBAN ALL EGY ELEM -- ES MIERT KELL ERRE ALLITAS.
 *
 * A rez ket erteket a `globals.css` ket BLOKKJA hordozza: a `:root` 0.55-ot,
 * a `[data-vilag="sotet"]` 0.62-t. Arra van allitas, hogy melyik blokk melyik
 * erteket DEKLARALJA (`terv-tokenek.spec.ts`). Arra NEM volt, hogy melyik fa
 * melyik blokk ALA esik -- pedig a ketto egyutt adja a kepernyon latszo szint.
 *
 * A KOSAR EZEN A LANCON ALL. Ot helyen keri a `--terv-kiemel` erteket (negy
 * szoveg, egy hatter), es mind az ot ma 0.55-ot kap -- de CSAK azert, mert a
 * kosar nincs sotet konteneren belul. Ha valaha barki `data-vilag="sotet"`-et
 * tesz egy kosar-kontenerre (peldaul mert a kosar is kap sotet valtozatot),
 * mind az ot ertek CSENDBEN 0.62-re valt.
 *
 * ES EZT KOMPONENS-ALLITAS NEM FOGJA MEG: jsdomban a CSS-valtozo nem oldodik
 * fel, tehat a komponens-tesztek a valtozo NEVET merik, nem az erteket. Egy
 * elmozdult szin ott zold marad.
 *
 * A HATAR, AMIT EZ A SPEC NEM LEP AT: forrast olvas, nem megrenderelt lapot. A
 * kirakatnak nincs bongeszos merohelye (vitest plusz jsdom), tehat kiszamolt
 * szint nem tudunk merni. Amit ez bizonyit: hogy a jelolo EGY helyen kerul ki,
 * es hogy a kosar fa nem allit vilagot. A kaszkad tobbi reszet nem.
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
     * A SPEC FAJLOK KIMARADNAK, ES EZ NEM KENYELEM: ez a fajl MAGA is
     * tartalmazza a keresett szoveget, tehat a sajat allitasaim novelnek a
     * szamot, amit merni akarok.
     */
    if (bejegyzes.includes(".spec.")) continue
    talalt.push(ut)
  }
  return talalt
}

const JELOLO = "data-vilag"

/**
 * A MEGJEGYZESEKET KISZEDJUK, MERT EGY EMLITES NEM HASZNALAT.
 *
 * Merve 2026-09-08: a lablec kapott egy megjegyzest, ami ELMAGYARAZZA, hogy a
 * `data-vilag="sotet"` csak a lapon BELUL all -- es ettol ez a spec ket
 * hasznalot latott egy helyett. A kod valtozatlan volt: egy prozai mondat
 * idezte a jelolot.
 *
 * Ugyanaz az alak, mint amikor egy javito szoveg idezi a regi alakot: a
 * MERESNEK a kodra kell mennie, nem a fajl szovegere. A repo mar ket helyen
 * hasznalja ezt (`hivatkozasok.spec.ts`, `betu-lancok` kornyeke).
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/**
 * A KITEVES JSX-ATTRIBUTUM (szokoz vagy sortores utan), NEM CSS-SZELEKTOR.
 *
 * Merve 2026-10-05: a Stripe mezo megjelenese (`stripe-megjelenes.ts`) a
 * lapbol OLVASSA ki a vilagot egy `querySelector`-ral, ugyanazzal a
 * szelektorral, amit a CSS figyel (`[data-vilag="sotet"]`). Ez nem allit
 * vilagot, tehat nem hasznalo; a szamlalo eddig megis annak vette, mert a
 * szoveg ugyanaz. A szelektor `[` utan all, az attributum szokoz utan.
 */
const KITESZI = new RegExp(`(^|\\s)${JELOLO}=`, "m")

const osszesHasznalo = forrasFajlok(GYOKER)
  .filter((ut) => KITESZI.test(kodSzoveg(readFileSync(ut, "utf-8"))))
  .map((ut) => ut.slice(GYOKER.length + 1))

/** Akik csak OLVASSAK a jelolot (CSS-szelektorkent), kiteves nelkul. */
const olvasok = forrasFajlok(GYOKER)
  .filter((ut) => {
    const kod = kodSzoveg(readFileSync(ut, "utf-8"))
    return kod.includes(`[${JELOLO}=`) && !KITESZI.test(kod)
  })
  .map((ut) => ut.slice(GYOKER.length + 1))

/**
 * AZ EGYETLEN, NEV SZERINTI KIVETEL: a fejlesztoi token-mintalap (P1a,
 * 2026-09-28). A ket modot EGYMAS MELLETT kell mutatnia a Figma-osszeveteshez,
 * tehat mindket vilagot kiteszi. Elesben nem renderel (`ACROPORA_TOKEN_MINTALAP`).
 *
 * A kivetel PONTOS utvonal, nem minta: egy masik fajl ugyanigy a szamlalo ala
 * esik, es ha a mintalap elkoltozik, az alabbi allitas pirosodik, nem csendben
 * tagul.
 */
const FEJLESZTOI_MINTALAPOK = [join("app", "tokenek", "page.tsx")]

const hasznalok = osszesHasznalo.filter(
  (ut) => !FEJLESZTOI_MINTALAPOK.includes(ut),
)

describe("ki állítja be a világot", () => {
  /**
   * ISMERT POZITIV KONTROLL: a keresés megtalálja a ma ismert helyet. Enélkül
   * a két számláló állítás akkor is zöld lenne, ha a bejárás semmit nem lát --
   * egy nullát mérő állítást egy üres világ is kielégít.
   */
  it("a keresés megtalálja a váz konténerét", () => {
    expect(hasznalok).toContain(
      join("modules", "products", "components", "lap-vaz", "index.tsx"),
    )
  })

  it("a data-vilag PONTOSAN egy helyen kerül ki", () => {
    expect(hasznalok).toHaveLength(1)
  })

  it("a kivétel pontosan a mintalap, és az valóban kiteszi a jelölőt", () => {
    expect(
      osszesHasznalo.filter((ut) => FEJLESZTOI_MINTALAPOK.includes(ut)),
    ).toEqual(FEJLESZTOI_MINTALAPOK)
  })

  /**
   * A SZURO KONTROLLJA, MINDKET IRANYBA: az ismert olvaso (a Stripe mezo)
   * nincs a hasznalok kozott, de a keresés latja; es egy attributum-alak
   * hasznalonak, egy szelektor-alak nem annak szamit.
   */
  it("a jelölőt csak olvasó Stripe-mező nem kiteszi a világot", () => {
    expect(olvasok).toContain(join("lib", "util", "stripe-megjelenes.ts"))
    expect(hasznalok).not.toContain(join("lib", "util", "stripe-megjelenes.ts"))
    expect(KITESZI.test(`<div ${JELOLO}={vilag}>`)).toBe(true)
    expect(KITESZI.test(`<div\n  ${JELOLO}="sotet">`)).toBe(true)
    expect(KITESZI.test(`querySelector('[${JELOLO}="sotet"]')`)).toBe(false)
  })

  it("a kosár fa SEHOL nem állít világot", () => {
    expect(
      hasznalok.filter((ut) => ut.startsWith(join("modules", "cart"))),
    ).toEqual([])
  })
})
