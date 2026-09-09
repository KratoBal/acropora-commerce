import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/** A megjegyzeseket kiszedi: mind a harom fajl leirja a sajat javitasat. */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const vaz = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))
const nav = kodSzoveg(
  readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "..",
      "layout",
      "templates",
      "nav",
      "index.tsx",
    ),
    "utf-8",
  ),
)
const css = readFileSync(
  join(__dirname, "..", "..", "..", "..", "styles", "globals.css"),
  "utf-8",
)

/**
 * A JOBB PANEL A FEJLEC ALJAHOZ TAPAD, NEM A NEZET TETEJEHEZ.
 *
 * Balazs szava: "a jobb oldali panel tapad de nem jol". Merve a kitelepitett
 * lapon (2026-09-09, 1440x900): a fejlec 79 pixel magas es a 268 ota vegig
 * lathato, a panel viszont 16 pixelre tapadt a nezet tetejetol, tehat a
 * tetejebol 63 PIXEL a fejlec ala csuszott.
 *
 * AMIT EZ A SPEC MER, ES AMIT NEM: a takaras maga ELRENDEZES, es jsdom nem
 * szamol elrendezest. Amit itt merni lehet, az a MECHANIZMUS: egy szam all-e a
 * ket helyen, es abbol szamol-e mind a ketto.
 * A pixelt a kitelepitett lapon a `scripts/panel-tapadas.cjs` meri.
 */
describe("a jobb panel a fejléc aljához tapad", () => {
  /** ISMERT POZITIV KONTROLL: tenyleg a harom fajlt olvastuk be. */
  it("a három forrás olvasható", () => {
    expect(vaz).toContain("vaz-jobb-halom")
    expect(nav).toContain("fejlec")
    expect(css).toContain(":root")
  })

  it("a magasság EGY helyen áll, és 79 pixel", () => {
    expect(css.match(/--fejlec-magassag:/g) ?? []).toHaveLength(1)
    /* 78 pixeles sav a tervbol, plusz az 1 pixeles also keret. */
    expect(css).toMatch(/--fejlec-magassag:\s*79px/)
  })

  it("a fejléc sávja abból a változóból számol", () => {
    expect(nav).toMatch(/calc\(var\(--fejlec-magassag\)/)
  })

  it("a panel tapadása is abból a változóból számol", () => {
    expect(vaz).toMatch(/top:\s*"calc\(var\(--fejlec-magassag\)/)
  })

  /**
   * A TAGADAS A LENYEG: a regi alak egy TALALT szam volt (`lg:top-4`), es
   * pontosan azert csuszott el, mert nem tudott a fejlecrol. Ha valaki
   * visszateszi, ez pirosra fordul -- a pozitiv allitas onmagaban nem zarna ki,
   * mert a ketto egymas mellett is megallna.
   */
  it("nincs többé fix tapadási szám a panelen", () => {
    expect(vaz).not.toMatch(/lg:top-\d/)
  })

  /**
   * ES A MASODIK KERDES: mi tortenik, ha a panel MAGASABB, mint a nezet.
   * Tapadaskor a bongeszo alul vagna le, es a "Kosarba" gomb elerhetetlenne
   * valna. Ma a panel 496 pixel, tehat ez nem all fenn -- a terven viszont tobb
   * sor van benne, tehat ez elore szol.
   */
  it("a panel magasságát a nézet korlátozza, és belül görget", () => {
    expect(vaz).toMatch(/maxHeight:\s*"calc\(100vh - var\(--fejlec-magassag\)/)
    expect(vaz).toContain("lg:overflow-y-auto")
  })
})
