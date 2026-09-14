import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A KEZDOLAP MINTA-ADATAINAK JELOLESE.
 *
 * === MIT VED EZ AZ ALLITAS, ES MIERT NEM ELEG EGY MEGJEGYZES ===
 *
 * A kezdolap ot savjabol harom MINTA-adatbol epul, mert a bolt ma nem tart
 * akciot, a Reef Club nem indult el, es nincs cikkforras. Ez rendben van --
 * Balazs igy kerte (2026-09-14: "ahol lehet ott eles ahol nem ott mock
 * adatokkal").
 *
 * AMI NINCS RENDBEN, AZ A JELOLETLEN MINTA. Egy kitalalt "-30%" a lapon
 * ugyanugy nez ki, mint egy valodi kedvezmeny, es kepernyokepen mar
 * hirdetesnek latszik. A jelzo az egyetlen dolog, ami a keppel EGYUTT utazik.
 *
 * === MIERT FORRAS-SZINTU ALLITAS ===
 *
 * A veszely nem az, hogy a jelzo ROSSZUL jelenik meg. Az, hogy egy KESOBBI
 * szerkeszto ujabb savot kot a minta-adatra, es a jelzot lefelejti rola. Ezt
 * nem a kirajzolt lapon lehet elkapni (az uj sav ott lenne, jelzo nelkul,
 * hibatlanul), hanem a fuggosegen: aki a minta-adatot olvassa, az a jelzot is
 * hasznalja. Az allitas ezert a fajlokat nezi, nem a DOM-ot.
 *
 * A nezett halmaz sem egy felsorolas: a mappa VALODI tartalmat jarja be, tehat
 * egy holnap letrehozott sav magatol beleesik. Egy kezzel karbantartott lista
 * pontosan attol vedene meg, aki mar tudja, hogy vedeni kell.
 */
const KEZDOLAP = join(__dirname, "components")

const tsxFajlok = (mappa: string): string[] => {
  const ki: string[] = []
  for (const bejegyzes of readdirSync(mappa, { withFileTypes: true })) {
    const ut = join(mappa, bejegyzes.name)
    if (bejegyzes.isDirectory()) {
      ki.push(...tsxFajlok(ut))
    } else if (bejegyzes.name.endsWith(".tsx")) {
      ki.push(ut)
    }
  }
  return ki
}

describe("a kezdőlap minta-adatainak jelölése", () => {
  const fajlok = tsxFajlok(KEZDOLAP).map((ut) => ({
    ut,
    forras: readFileSync(ut, "utf-8"),
  }))

  /**
   * A KONTROLL: van egyaltalan olyan fajl, amit ez az allitas nez.
   *
   * Ha a mappa atnevezodne vagy kiurulne, a lenti `forEach` NULLA allitast
   * futtatna, es a teszt ZOLDEN allna. Ez a sor kulonbozteti meg a
   * "minden rendben" esetet a "semmit nem neztem meg" esettol.
   */
  it("van vizsgált sáv-komponens", () => {
    expect(fajlok.length).toBeGreaterThanOrEqual(5)
  })

  it("ami minta-adatot olvas, az a jelzőt is kiteszi", () => {
    const mintat_olvas = fajlok.filter((f) =>
      f.forras.includes("@modules/kezdolap/minta-adat"),
    )

    expect(mintat_olvas.length).toBeGreaterThan(0)

    for (const f of mintat_olvas) {
      expect(
        f.forras.includes("MintaJelzo"),
        `${f.ut} minta-adatot olvas, de nem teszi ki a MintaJelzo címkét`,
      ).toBe(true)
    }
  })

  /**
   * A REEF CLUB URLAPJA TILTOTT MARAD, AMIG NINCS LISTA.
   *
   * Egy mukodonek latszo, de nemaba futo urlap rosszabb a hianyzo urlapnal: a
   * vevo azt hiszi, feliratkozott. Ha valaki a `disabled` jelzot leveszi, azt
   * egy feliratkozo lista bekotesevel EGYUTT kell tennie -- ez az allitas
   * akkor bukik el, es ott all mellette az indok.
   */
  it("a Reef Club feliratkozó mezője és gombja tiltott", () => {
    const forras = readFileSync(
      join(KEZDOLAP, "reef-club", "index.tsx"),
      "utf-8",
    )

    const mezo = forras.slice(
      forras.indexOf("<input"),
      forras.indexOf("<input") + 400,
    )
    const gomb = forras.slice(
      forras.indexOf("<button"),
      forras.indexOf("<button") + 400,
    )

    expect(mezo).toContain("disabled")
    expect(gomb).toContain("disabled")
  })
})
