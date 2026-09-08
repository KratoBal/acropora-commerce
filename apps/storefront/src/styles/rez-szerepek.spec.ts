import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A REZ HAROM TOKENJE HAROM SZEREP -- ES A SZEREPET A POZICIO ARULJA EL.
 *
 *   --terv-kiemel         felulet   (background, border)  vilagos 0.55  sotet 0.62
 *   --terv-kiemel-szoveg  a rezen ALLO szoveg             vilagos feher sotet 0.15
 *   --terv-kiemel-tinta   rez szinu szoveg a lapon        vilagos 0.55  sotet 0.68
 *
 * A FELULET-TOKEN SOHA NEM ALLHAT `color:` POZICIOBAN. Ez az invarians, es
 * pontosan az a hiba hivta elo, amit ez a PR javit: a kosar negy rez-SZOVEGE a
 * felulet-tokenen allt.
 *
 * MIERT NEM LATSZOTT: a VILAGOS lapon a felulet es a tinta EGYBEESIK (mind a
 * ketto 0.55), es a kosar a vilagos vilag -- tehat a rossz token is HELYES
 * szint adott. A kulonbseg csak a SOTET lapon all elo (0.62 kontra 0.68), ahova
 * a kosar ma nem jut el. Egy rossz token, ami jo szint ad, addig marad rossz,
 * amig valami el nem mozdul.
 *
 * A HATAR: ez a spec a FORRAST olvassa, nem megrenderelt lapot. A kirakatnak
 * nincs bongeszos merohelye, tehat kiszamolt szint nem tudunk merni. Amit
 * bizonyit: melyik tokent KERI a kod, nem azt, mi jelenik meg.
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

/** Minden `background: "var(--terv-kiemel...)"` hasznalat, fajllal egyutt. */
const hatterHasznalatok = forrasFajlok(GYOKER).flatMap((ut) => {
  const tartalom = readFileSync(ut, "utf-8")
  return Array.from(
    tartalom.matchAll(/background:\s*"var\((--terv-kiemel[a-z-]*)\)"/g),
  ).map((m) => ({ fajl: ut.slice(GYOKER.length + 1), token: m[1] }))
})

const szinHasznalatok = forrasFajlok(GYOKER).flatMap((ut) => {
  const tartalom = readFileSync(ut, "utf-8")
  return Array.from(
    tartalom.matchAll(/color:\s*"var\((--terv-kiemel[a-z-]*)\)"/g),
  ).map((m) => ({ fajl: ut.slice(GYOKER.length + 1), token: m[1] }))
})

describe("a réz tokenek szerepe a pozíciójukból", () => {
  /**
   * ISMERT POZITIV KONTROLL, ELOL: a kereses tenyleg talal rez `color:`
   * hasznalatokat. Enelkul az alabbi tagado allitas akkor is zold lenne, ha a
   * bejaras semmit nem lat -- egy ures halmaz minden szabalynak megfelel.
   */
  it("a keresés talál réz color: használatokat", () => {
    expect(szinHasznalatok.length).toBeGreaterThanOrEqual(5)
  })

  it("a felület-token soha nem áll color: pozícióban", () => {
    const rosszak = szinHasznalatok.filter((h) => h.token === "--terv-kiemel")

    expect(rosszak).toEqual([])
  })

  /**
   * ES AMI `color:` POZICIOBAN ALLHAT: csak a ket szoveg-szerepu token. Egy uj
   * rez-token bevezetese igy nem csuszhat be ide eszrevetlenul.
   */

  /**
   * ES A TUKRE, AMIT EGY KALIBRACIO KENYSZERITETT KI: a ket SZOVEG-szerepu
   * token soha nem allhat `background:` poziciban.
   *
   * A jelveny hatteret probakeppen a TINTA tokenre allitottam (letezo, de
   * rossz szerepu rez -- a legelethubb tevedes, mert mind a ketto "rez", es a
   * vilagos lapon egyforma). A komponens sajat allitasa megfogta; EZ a spec
   * NEM, mert csak a `color:` poziciot nezte.
   *
   * Egy orzo, ami a szerepekrol szol, de csak az egyik iranyt meri, a masik
   * iranyban pont olyan nema, mint ha nem letezne.
   */
  it("a szöveg-szerepű tokenek soha nem állnak background: pozícióban", () => {
    const rosszak = hatterHasznalatok.filter((h) => h.token !== "--terv-kiemel")

    expect(rosszak).toEqual([])
  })

  /** ISMERT POZITIV KONTROLL a masik iranyra is: talal-e egyaltalan hattereket. */
  it("a keresés talál réz background: használatokat", () => {
    expect(hatterHasznalatok.length).toBeGreaterThanOrEqual(3)
  })

  it("color: pozícióban csak a két szöveg-szerepű token áll", () => {
    const nevek = Array.from(
      new Set(szinHasznalatok.map((h) => h.token)),
    ).sort()

    expect(nevek).toEqual(["--terv-kiemel-szoveg", "--terv-kiemel-tinta"])
  })
})
