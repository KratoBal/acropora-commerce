import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { FEJLEC_MENU_TERV, kulcs } from "@lib/util/fejlec-menu-pontok"

/**
 * A TERMEKLAP GYOKERENEK KIEMELESE A FEJLECBEN (2026-09-29, 215:41).
 *
 * Harom darabon all, es mindharom kell: a lap vaza kiteszi a
 * `data-fejlec-gyoker` jelolot, a menu pontjai `data-fejlec-pont`-ot viselnek,
 * es a `globals.css` szabalya parositja oket. Itt a ketto kozotti SZERZODES
 * all: a pont kulcsa a felirat kulcsa, es minden katalogus-gyokeres pontnak
 * van szabalya.
 *
 * MI PIROSIT: ha a terv uj gyoker-pontot kap szabaly nelkul; ha egy szabaly
 * kimarad; ha a felirat kulcsa elter a gyoker kulcsatol (akkor a jelolo es a
 * pont sosem talalkozik).
 */
// A formazo a hosszu szelektort torheti; a szerzodes a tartalomra szol.
const css = readFileSync(
  join(__dirname, "..", "..", "..", "..", "styles", "globals.css"),
  "utf8",
).replace(/\s+/g, " ")
const gyokeresPontok = FEJLEC_MENU_TERV.filter((terv) => terv.gyoker)

describe("a termék gyökerének kiemelése a fejléc menüjében", () => {
  it("minden katalógus-gyökeres pont felirat-kulcsa a gyökér kulcsa", () => {
    for (const terv of gyokeresPontok) {
      expect(kulcs(terv.felirat)).toBe(terv.gyoker)
    }
  })

  it("minden katalógus-gyökeres pontnak van kiemelő szabálya", () => {
    for (const terv of gyokeresPontok) {
      expect(css).toContain(
        `body:has([data-fejlec-gyoker~="${terv.gyoker}"]) [data-fejlec-pont="${terv.gyoker}"]`,
      )
    }
    expect(css.match(/\[data-fejlec-pont="/g) ?? []).toHaveLength(
      gyokeresPontok.length,
    )
  })

  it("a kiemelés a Figma aktív pontja: 600-as súly, címszín", () => {
    const blokk = css.slice(css.indexOf("[data-fejlec-pont="))
    expect(blokk.slice(0, blokk.indexOf("}"))).toMatch(
      /font-weight:\s*600;\s*color:\s*var\(--acr-mode-heading\)/,
    )
  })

  it("a terméklap a gyökereit a világot adó feloldásból adja át", () => {
    const lap = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "products",
        "templates",
        "muszaki-lap",
        "index.tsx",
      ),
      "utf8",
    )
    expect(lap).toMatch(
      /fejlecGyokerek=\{\[\s*\.\.\.new Set\(termekGyokerNevei\(product, kategoriak\)\.map\(kulcs\)\),?\s*\]\}/,
    )
  })
})
