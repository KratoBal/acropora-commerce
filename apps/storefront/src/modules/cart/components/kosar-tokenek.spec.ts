import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A KOSAR KERETEI MELEGEK -- MERVE, NEM IZLESBOL.
 *
 * A ket token egyetlen szamban ter el, es az a SZINEZET:
 *
 *   --terv-keret        oklch(0.88 0.005 250)   hideg
 *   --terv-keret-meleg  oklch(0.88 0.008 70)    meleg
 *
 * A KOSAR-TERVBOL kiolvasva (`exchange/design-balazs/tokenek-kosar.json`) a
 * keret-szinek mind meleg szinezetuek: 0.88/0.008/70 tizennegy elemen, plusz
 * 0.9, 0.85, 0.89, 0.78 es 0.82 ugyanazon a 70-es szinezeten. A hideg, 250-es
 * szinezetu keret a kosar tervlapjan EGYETLEN elemen sem fordul elo.
 *
 * === MIT VESZ EL EZ AZ ORZO, ES MIERT VALLALHATO ===
 *
 * Megtiltja a hideg keret-tokent a kosar komponenseiben. Mivel a kosar-tervben
 * nulla ilyen elem all, ez NEM vesz el semmit, amit a terv tamogat. Ha valaki
 * megis hideg keretet akar ide, ez pirosra valt, es akkor meg kell mondania,
 * mire hivatkozva -- ez a szandeka.
 *
 * (Nautilus jelezte a ket token osszekeveresenek veszelyet, 14462. Ket helyen
 * tenyleg a hideg allt. Nem hibazott es nem hasalt el semmi.)
 */

const KOSAR = join(process.cwd(), "src/modules/cart")

function forrasok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) {
      talalt.push(...forrasok(ut))
    } else if (/\.tsx?$/.test(nev) && !/\.spec\.tsx?$/.test(nev)) {
      talalt.push(ut)
    }
  }
  return talalt
}

describe("a kosár keret-tokenjei", () => {
  const fajlok = forrasok(KOSAR)

  /**
   * ISMERT POZITIV KONTROLL, ELOL, ES KET RESZBEN. Egy ures sopres ugyanugy
   * nezne ki, mint egy tiszta eredmeny -- ezert eloszor azt mutatjuk meg, hogy
   * a kereses TALAL fajlokat, ES hogy MEGTALALJA benne a meleg tokent.
   */
  it("a keresés tényleg lát fájlokat, és lát bennük token-hivatkozást", () => {
    expect(fajlok.length).toBeGreaterThanOrEqual(10)

    const melegek = fajlok.filter((f) =>
      readFileSync(f, "utf-8").includes("var(--terv-keret-meleg)"),
    )
    expect(melegek.length).toBeGreaterThan(0)
  })

  it("egyetlen kosár-komponens sem használja a hideg keretet", () => {
    const hidegek = fajlok.filter((f) =>
      readFileSync(f, "utf-8").includes("var(--terv-keret)"),
    )

    expect(hidegek.map((f) => f.replace(KOSAR, ""))).toEqual([])
  })
})
