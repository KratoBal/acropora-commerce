import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * AZ ADATRETEG FORRASARA MERUNK, MERT BEHUZNI NEM LEHET.
 *
 * A `categories.ts` `server-only`, tehat jsdom alatt nem importalhato -- ezt
 * megmertuk (2026-09-09: a spec elso futasa nem pirosat adott, hanem
 * "This module cannot be imported from a Client Component module"). Amit ott
 * merni lehet, az a SZOVEGE.
 *
 * EZ GYENGEBB ALLITAS, MINT EGY VISELKEDES-TESZT, es ezt ki kell mondani: azt
 * meri, hogy a bejaras a mert fuggvenybol jon, nem azt, hogy jol jarja be a
 * fat. Az utobbi a `kategoria-leszarmazottak.spec.ts` dolga, es ott van is ra
 * allitas -- ez a spec csak azt orzi, hogy az ELO ut oda vezessen.
 */
const kod = (() => {
  const nyers = readFileSync(join(__dirname, "categories.ts"), "utf8")
  /* A megjegyzeseket kiszedjuk, kulonben a SAJAT magyarazo szovegunk lenne a
     talalat -- a repo mar hasznalja ezt az alakot a lablec specjeben. */
  return nyers.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
})()

describe("a kategória-adatréteg a mért bejárást használja", () => {
  /**
   * A HIVAS ALAKJARA MERUNK, NEM A NEVRE: az `import` sor is tartalmazza a
   * nevet, tehat egy sima `toContain` akkor is zold maradna, ha a hivast
   * kivennenk. Ugyanaz a buktato, amit a lablec specje mar leir.
   */
  it("két helyen hívja a mért bejárást: a leszármazottaknál és a gyökér-számoknál", () => {
    const hivasok = kod.match(/leszarmazottAzonositok\(/g) ?? []

    expect(hivasok).toHaveLength(2)
  })

  /**
   * ES A TAGADO IRANY, AMI A LENYEG: nincs SAJAT bejaras a fajlban.
   *
   * A #260 KETTO peldanyt nevezett meg, es HAROM volt: a harmadik ugyanebben a
   * fajlban ult, a gyoker-szamolo fuggveny belsejeben, huszonot sorral lejjebb.
   * Egy sorral lejjebb irt masolat ugyanugy elkerulte a merest, mint egy masik
   * fajlban allo.
   */
  it("nincs kézzel írt bejárás az adatrétegben", () => {
    expect(kod).not.toMatch(/while\s*\(/)
  })
})
