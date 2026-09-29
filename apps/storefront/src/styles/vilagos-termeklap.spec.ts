import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A VILAGOS (MUSZAKI) TERMEKLAP A 192:57 SZERINT (P2, 2026-09-29).
 *
 * A lap vaza a regi `--terv-*` tokenekbol festi magat. A sotet vilagot a
 * `globals.css` sotet blokkja allitja at; a vilagosat ez a blokk, az
 * `acropora-tokens.css`-ben, a Foundations primitivjeire.
 *
 * MI PIROSIT: ha a vilagos blokk MAS tokenhalmazt ir felul, mint a sotet (akkor
 * egy token a regi `:root` ertekkel maradna a vilagos lapon); ha egy ertek nem
 * Foundations-primitiv; ha a betu nem a Hanken; ha az ar-szabaly eltunik.
 */
const TOKENEK = readFileSync(join(__dirname, "acropora-tokens.css"), "utf8")
const GLOBALS = readFileSync(join(__dirname, "globals.css"), "utf8")

const blokk = (css: string, fej: string) => {
  const kezd = css.indexOf(fej)
  return kezd === -1 ? "" : css.slice(kezd, css.indexOf("}", kezd))
}
const tervNevek = (szoveg: string) =>
  Array.from(szoveg.matchAll(/(--terv-[a-z-]+):\s*([^;]+);/g)).map(
    ([, nev, ertek]) => [nev, ertek.trim()] as const,
  )

const VILAGOS = tervNevek(
  blokk(TOKENEK, '[data-vilag="vilagos"] {\n  --terv-hatter'),
)
const SOTET = tervNevek(
  blokk(
    GLOBALS,
    'body:has([data-vilag="sotet"]) footer[data-testid="lablec-sik"] {',
  ),
)

describe("a világos terméklap tokenjei", () => {
  it("ugyanazokat a színtokeneket írja felül, mint a sötét blokk", () => {
    expect(SOTET.length).toBeGreaterThan(5)
    expect(
      VILAGOS.map(([n]) => n)
        .filter((n) => !n.includes("betu"))
        .sort(),
    ).toEqual(SOTET.map(([n]) => n).sort())
  })

  it("minden szín Foundations-primitív", () => {
    for (const [nev, ertek] of VILAGOS.filter(([n]) => !n.includes("betu"))) {
      expect(`${nev}: ${ertek}`).toMatch(/: var\(--acr-color-[a-z-]+\)$/)
    }
  })

  it("a betű a Hanken, a technikai értékeké is", () => {
    const betu = Object.fromEntries(VILAGOS.filter(([n]) => n.includes("betu")))
    expect(betu["--terv-betu-fo-lanc"]).toMatch(/^var\(--acr-font-hanken\)/)
    expect(betu["--terv-betu-mono-lanc"]).toMatch(/^var\(--acr-font-hanken\)/)
  })

  it("az ár a 192:57 szerint, a világos jelölőre kötve", () => {
    const ar = blokk(GLOBALS, '[data-vilag="vilagos"] .termeklap-ar {')
    expect(ar).toContain("font-size: 36px")
    expect(ar).toContain("font-weight: 700")
    expect(ar).toContain("letter-spacing: -0.5px")
  })

  /*
    3a-2 (193:74, 193:77): asztalon a foto korul nincs doboz, a kep sajat
    keretet visel, a belyegkepek 126 pixeles oszlopokban, 126:82 aranyban,
    navy aktiv kerettel. A sotet lap ezekbol semmit nem kap.
  */
  it("a kép és a bélyegképek a 192:57 szerint, csak asztalon és csak világosban", () => {
    const media = GLOBALS.slice(GLOBALS.indexOf("A VILAGOS TERMEKLAP KEPE"))
    const lg = media.slice(media.indexOf("@media (min-width: 1024px)"))
    expect(lg).toMatch(
      /\[data-vilag="vilagos"\] #vaz-foto \{\s*border-width: 0;\s*padding: 0;/,
    )
    expect(lg).toMatch(
      /\[data-vilag="vilagos"\] \.termeklap-nagykep \{\s*border: 1px solid var\(--terv-keret\);/,
    )
    expect(lg).toMatch(
      /\.termeklap-belyegsor \{\s*grid-template-columns: repeat\(6, 126px\);/,
    )
    expect(lg).toMatch(/\.termeklap-belyeg \{\s*aspect-ratio: 126 \/ 82;/)
    expect(TOKENEK).toContain(
      "--termeklap-belyeg-aktiv: var(--acr-color-navy);",
    )
  })
})
