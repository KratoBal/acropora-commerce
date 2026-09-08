import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A SZERIF BETUT EGYETLEN UTON KOTJUK BE: a `font-kiemelt` OSZTALLYAL.
 *
 * === MIERT KELL ORZO EGY STILUS-KERDESRE ===
 *
 * Ket ut letezett ugyanahhoz az ertekhez: a Tailwind `font-kiemelt` osztaly es
 * a beagyazott `style={{ fontFamily: "var(--terv-betu-kiemelt-lanc)" }}`. Ez
 * onmagaban nem hiba -- de MERHETETLENNE teszi a keszletet.
 *
 * Merve 2026-09-08: a "hany helyen all a szerif" kerdesre a `font-kiemelt`
 * mintaval KETTOT talaltam, es HAROM volt. A harmadik beagyazott alakban allt
 * az `empty-cart-message`-ben. A szam nem azert volt rossz, mert rosszul
 * szamoltam, hanem mert a kerdes egy MECHANIZMUSRA szolt, es ketto volt.
 *
 * === AMIT EZ AZ ORZO MER, ES AMIT NEM ===
 *
 * MER: hogy a lanc neve nem bukkan fel beagyazott `style`-ban a kirakat
 * forrasaban. NEM MER: hogy a szerif a HELYES helyeken all -- azt a
 * komponensek sajat specjei mondjak meg.
 *
 * === ES AMIERT NEM A LANC TILTASA AZ ALLITAS ===
 *
 * A lanc DEFINICIOJA (`globals.css`) es a Tailwind-konfig hivatkozasa
 * legitim -- ezert csak a `src` fa komponens-fajljait jarjuk be, es a
 * `fontFamily:` POZICIOT nezzuk, nem a nevet onmagaban.
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
    /** A spec fajlok kimaradnak: ez a fajl maga is tartalmazza a keresett alakot. */
    if (bejegyzes.includes(".spec.")) continue
    talalt.push(ut)
  }
  return talalt
}

const beagyazottSzerif = forrasFajlok(GYOKER).flatMap((ut) => {
  const tartalom = readFileSync(ut, "utf-8")
  return Array.from(
    tartalom.matchAll(/fontFamily:\s*"var\(--terv-betu-kiemelt-lanc\)"/g),
  ).map(() => ut.slice(GYOKER.length + 1))
})

const osztalySzerif = forrasFajlok(GYOKER).flatMap((ut) => {
  const tartalom = readFileSync(ut, "utf-8")
  return Array.from(tartalom.matchAll(/font-kiemelt/g)).map(() =>
    ut.slice(GYOKER.length + 1),
  )
})

describe("a szerif betű egyetlen mechanizmuson keresztül köt", () => {
  /**
   * ISMERT POZITIV KONTROLL, ES NEM DISZ: enelkul a tagado allitas egy URES
   * fabejarast is kielegitene. Ha a bejaras egyszer nem talal fajlt (rossz
   * gyoker, kiterjesztes-szures), a tagadas ZOLD marad, es a vedelem eltunik
   * anelkul, hogy barmi szolna.
   */
  it("a bejárás lát legalább két osztály-alapú kötést", () => {
    expect(osztalySzerif.length).toBeGreaterThanOrEqual(2)
  })

  it("egyetlen komponens sem köti a szerifet beágyazott stílusban", () => {
    expect(beagyazottSzerif).toEqual([])
  })
})
