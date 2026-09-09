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
 * === ES EGY MASODIK, KISEBB CSUSZAS UGYANITT (2026-09-09 este) ===
 *
 * A javitas utan a panel `calc(var(--fejlec-magassag) + 1rem)` erteken tapadt,
 * ami 95 pixel -- a fejlec ALJA viszont 115. A kulonbseg pontosan a BIZALMI
 * SAV (36 pixel), amit a `--fejlec-magassag` nem tartalmaz. Vagyis a panel meg
 * mindig 20 pixellel a fejlec ala csuszott, csak sokkal kevesbe feltunoen.
 *
 * A javitas egy uj valtozo (`--fejlec-teljes-magassag`), es vele eltunt egy
 * KEZZEL beirt 36-os a lenyilo panel keplebol is.
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

  /**
   * A TELJES FEJLEC A KETTOBOL SZAMOLODIK, NEM EGY HARMADIK SZAMBOL.
   *
   * Ez az allitas azt orzi, hogy a bizalmi sav magassaga NE keruljon vissza
   * kezzel beirt szamkent -- eddig ket helyen allt (a sav stilusaban es a
   * lenyilo panel keplebeen), es a harmadik helyrol (a tapado panel)
   * HIANYZOTT. Egy szam, ami tobb helyen all, pontosan igy csuszik szet.
   */
  it("a teljes fejléc a két változóból számol", () => {
    expect(css.match(/--fejlec-bizalmi-magassag:/g) ?? []).toHaveLength(1)
    expect(css).toMatch(
      /--fejlec-teljes-magassag:\s*calc\(\s*var\(--fejlec-magassag\)\s*\+\s*var\(--fejlec-bizalmi-magassag\)/,
    )
  })

  /**
   * ES A BIZALMI SAV IS A VALTOZOBOL, NEM KEZZEL BEIRT SZAMBOL.
   *
   * EZT AZ ALLITAST A KALIBRACIO KERTE, NEM ELORE IRTAM MEG. A rontasaim
   * kozott felvettem egy FELMEROT: visszairtam a `36px`-et a sav stilusaba,
   * es NULLA allitas fordult pirosra. Vagyis a "harom helyen egy szam" hibara,
   * ami ennek a valtozasnak a TARGYA, nem volt orzo -- csak az uj kepletekre.
   *
   * A sav a harmadik olvasoja ugyanannak a szamnak; ha az kezzel beirt marad,
   * a valtozo es a literal elcsuszhat, es a csuszas ugyanolyan csendes lesz,
   * mint a mai 20 pixel volt.
   */
  it("a bizalmi sáv magassága is a változóból jön", () => {
    expect(nav).toContain("var(--fejlec-bizalmi-magassag)")
    expect(nav).not.toMatch(/height:\s*"36px"/)
  })

  it("a fejléc sávja abból a változóból számol", () => {
    expect(nav).toMatch(/calc\(var\(--fejlec-magassag\)/)
  })

  /**
   * A PANEL A TELJES FEJLEC ALJAHOZ TAPAD, RES NELKUL.
   *
   * Itt korabban `calc(var(--fejlec-magassag) + 1rem)` allt, es a nev
   * ("abbol a valtozobol szamol") IGAZ volt -- csak a ROSSZ valtozobol. Egy
   * allitas, ami a mechanizmust meri, atmegy egy rossz ERTEK mellett is.
   *
   * Balazs kerese: a panel teteje PONTOSAN a fejlec ala tapadjon, res nelkul.
   */
  it("a panel a teljes fejléc aljához tapad, rés nélkül", () => {
    expect(vaz).toMatch(/top:\s*"var\(--fejlec-teljes-magassag\)"/)
  })

  /**
   * ES A TAGADAS: a RESZLEGES magassag nem szamolhat a tapadasban.
   * A fenti allitas onmagaban nem zarna ki, hogy valaki visszateszi a regi
   * kepletet EGY MASIK sorban -- ez igen.
   */
  it("a tapadás nem a nav sáv magasságából számol", () => {
    expect(vaz).not.toMatch(/top:[^\n]*--fejlec-magassag/)
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
    expect(vaz).toMatch(/calc\(100vh - var\(--fejlec-teljes-magassag\)/)
    expect(vaz).toContain("lg:overflow-y-auto")
  })
})
