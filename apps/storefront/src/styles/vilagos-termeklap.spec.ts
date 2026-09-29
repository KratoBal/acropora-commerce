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
    // A vasarlasi kartya ara: a zarosor sajat, 20 pixeles arat nem erinti.
    const fej = '[data-vilag="vilagos"] #vaz-ar .termeklap-ar {'
    const mobil = blokk(GLOBALS, fej)
    expect(mobil).toContain("font-size: 28px")
    expect(mobil).toContain("font-weight: 700")
    const asztal = GLOBALS.slice(GLOBALS.indexOf(fej) + fej.length)
    const lg = asztal.slice(asztal.indexOf("@media (min-width: 1024px)"))
    const asztali = blokk(lg, fej)
    expect(asztali).toContain("font-size: 36px")
    expect(asztali).toContain("letter-spacing: -0.5px")
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

  /*
    3b (193:181, 193:202): a kapcsolat-szakaszok felso vonallal es 600/22
    cimmel, a zarosor a tartalom szelessegeben, feher, keretes, 700/20-as
    arral.
  */
  it("a lap alja a 192:57 szerint", () => {
    const alja = GLOBALS.slice(GLOBALS.indexOf("A VILAGOS TERMEKLAP ALJA"))
    expect(alja).toMatch(
      /\[data-vilag="vilagos"\] #vaz-kiegeszitok,\s*\[data-vilag="vilagos"\] #vaz-hasonlo \{\s*border-top: 1px solid var\(--terv-keret\);\s*padding-top: 31px;/,
    )
    expect(alja).toMatch(
      /> h2 \{\s*font-size: 22px;\s*line-height: 29px;\s*font-weight: 600;\s*margin-bottom: 18px;/,
    )
    expect(
      blokk(alja, '[data-vilag="vilagos"] .termeklap-zarosor .termeklap-ar {'),
    ).toContain("font-size: 20px")
    const sav = blokk(alja, '[data-vilag="vilagos"] .termeklap-zarosor {')
    expect(sav).toContain("max-width: 1352px")
    expect(sav).toContain("border: 1px solid var(--terv-keret)")
    expect(sav).toContain("background: var(--terv-hatter-lap)")
  })

  /*
    3c (196:3): mobilon nincs morzsamenu, a vasarlasi csoport doboz nelkul
    all (a beagyazott stilus miatt `!important`, szuk hatokorrel), a ragados
    sav ara 600/16, a gombja legalabb 126 pixeles.
  */
  it("a mobil a 196:3 szerint", () => {
    const resz = GLOBALS.slice(GLOBALS.indexOf("A VILAGOS TERMEKLAP MOBILON"))
    const mob = resz.slice(resz.indexOf("@media (max-width: 1023.98px)"))
    expect(
      blokk(mob, '[data-vilag="vilagos"] [data-testid="lap-morzsa-sav"] {'),
    ).toContain("display: none")
    const panel = blokk(
      mob,
      '[data-vilag="vilagos"] [data-vaz-csoport="vasarlas"] {',
    )
    expect(panel).toContain("border-width: 0 !important")
    expect(panel).toContain("padding: 0 !important")
    expect(
      blokk(
        resz,
        '[data-vilag="vilagos"] .termeklap-ragados-ar .termeklap-ar {',
      ),
    ).toContain("font-size: 16px")
    expect(
      blokk(resz, '[data-vilag="vilagos"] .termeklap-ragados-cselekves > * {'),
    ).toContain("min-width: 126px")
  })
})
