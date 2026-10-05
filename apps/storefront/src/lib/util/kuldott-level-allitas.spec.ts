import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A KIRAKAT NEM ALLITJA, HOGY LEVELET KULDTUNK (Balazs, 2026-10-05: "amig
 * level nem megy, egyik se allitsa, hogy kuldtunk"). A commerce hatter ma
 * egyetlen vevoi levelet sem kuld: nincs e-mail csatornas ertesito modul.
 *
 * MI PIROSIT: egy latszo szoveg a kirakat kodjaban, ami kuldott levelet allit
 * ("elküldtük", "küldtünk", "elküldve"). A megjegyzesek kimaradnak: egy
 * magyarazat idezheti a regi mondatot.
 *
 * HA A LEVEL ELKESZUL, ez a spec a helyes alakra irando at, nem torlendo: akkor
 * az a mondat lesz igaz, ami a levelet tenyleg kiadja.
 */
const SRC = join(__dirname, "..", "..")

function forrasFajlok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) {
      talalt.push(...forrasFajlok(ut))
      continue
    }
    if (/\.tsx?$/.test(nev) && !/\.spec\.tsx?$/.test(nev)) talalt.push(ut)
  }
  return talalt
}

/** A JS- es JSX-megjegyzesek kiszedve. */
const kod = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const KULDOTT_LEVEL = /elküldtük|küldtünk|elküldve|elküldtünk/i

describe("a kirakat nem állít küldött levelet", () => {
  it("egyetlen forrásfájl kódjában sem áll ilyen mondat", () => {
    const talalatok = forrasFajlok(SRC)
      .filter((ut) => KULDOTT_LEVEL.test(kod(readFileSync(ut, "utf-8"))))
      .map((ut) => ut.slice(SRC.length + 1))
    expect(talalatok).toEqual([])
  })

  it("a minta megfogja a régi mondatokat, és a megjegyzésben állót nem (kontroll)", () => {
    for (const regi of [
      "A rendelés visszaigazolását elküldtük ide:",
      "Ellenőrző linket küldtünk ide:",
      "Átvételi kérelemről szóló e-mail elküldve ide:",
    ]) {
      expect(KULDOTT_LEVEL.test(kod(`<Text>${regi}</Text>`)), regi).toBe(true)
    }
    expect(KULDOTT_LEVEL.test(kod(`{/* a regi mondat: elküldtük */}`))).toBe(
      false,
    )
  })
})
