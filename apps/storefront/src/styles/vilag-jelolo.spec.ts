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

const hasznalok = forrasFajlok(GYOKER)
  .filter((ut) => readFileSync(ut, "utf-8").includes(`${JELOLO}=`))
  .map((ut) => ut.slice(GYOKER.length + 1))

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

  it("a kosár fa SEHOL nem állít világot", () => {
    expect(
      hasznalok.filter((ut) => ut.startsWith(join("modules", "cart"))),
    ).toEqual([])
  })
})
