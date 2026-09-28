import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import foundations from "./__fixtures__/figma-foundations.json"

import acrTailwind from "../../tailwind-acropora"

/**
 * A TOKEN-FAJL ES A FIGMA-KIOLVASAS EGYEZESE (P1a).
 *
 * A fixtura a Figma Foundations frame kiolvasott erteke; a CSS-t kezzel is
 * lehet szerkeszteni. MI PIROSIT: egy atirt vagy elgepelt szin; egy mod-token,
 * ami csak az egyik modban van meg (a Reef lapon akkor a Commerce ertek
 * oroklodne, szo nelkul); egy Tailwind-nev, ami nem letezo valtozora mutat.
 */
const css = readFileSync(join(__dirname, "acropora-tokens.css"), "utf8")

/** Egy szelektor-blokk valtozoi, a nevukkel es az ertekukkel. */
function blokk(szelektor: string): Map<string, string> {
  const kezdet = css.indexOf(szelektor + " {")
  expect(kezdet, `nincs ilyen blokk: ${szelektor}`).toBeGreaterThanOrEqual(0)
  const vege = css.indexOf("}", kezdet)
  const torzs = css.slice(kezdet, vege)
  return new Map(
    Array.from(torzs.matchAll(/(--acr-[\w-]+):\s*([^;]+);/g)).map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}

const alap = blokk(":root")
const commerce = blokk(':root,\n[data-vilag="vilagos"]')
const reef = blokk('[data-vilag="sotet"]')

describe("acropora-tokens.css a Figma Foundations szerint", () => {
  it("mind a 14 szin-primitiv betura a Figma-ertek", () => {
    const szinek = Object.entries(foundations.colors)
    expect(szinek).toHaveLength(14)
    for (const [nev, hex] of szinek) {
      expect(alap.get(`--acr-color-${nev}`), nev).toBe(hex)
    }
  })

  it("a terkozok, a lekerekitesek es az arnyek a Figma-ertek", () => {
    for (const [nev, px] of Object.entries(foundations.spacing)) {
      expect(alap.get(`--acr-space-${nev}`), nev).toBe(`${px}px`)
    }
    for (const [nev, px] of Object.entries(foundations.radius)) {
      expect(alap.get(`--acr-radius-${nev}`), nev).toBe(px ? `${px}px` : "0")
    }
    expect(alap.get("--acr-shadow-subtle")).toBe(
      "0 2px 8px rgba(0, 0, 0, 0.06)",
    )
  })

  it("a ket mod UGYANAZT a token-halmazt adja, a Figma mod-kartyai szerint", () => {
    expect(Array.from(commerce.keys()).sort()).toEqual(
      Array.from(reef.keys()).sort(),
    )
    for (const [mod, terkep] of [
      ["commerce", commerce],
      ["reef", reef],
    ] as const) {
      for (const [nev, szin] of Object.entries(foundations.modes[mod])) {
        expect(terkep.get(`--acr-mode-${nev}`), `${mod}/${nev}`).toBe(
          `var(--acr-color-${szin})`,
        )
      }
    }
  })

  it("a betu-tokenek tartalekkal allnak (egy nem letezo valtozo tartalek nelkul az egesz csaladot ervenytelenitene)", () => {
    for (const nev of ["sans", "serif", "wordmark"]) {
      expect(alap.get(`--acr-font-${nev}`), nev).toMatch(/var\(--[\w-]+, "/)
    }
  })

  it("a Tailwind-tema minden `--acr-` hivatkozasa letezo valtozora mutat", () => {
    const definialt = new Set(
      Array.from(alap.keys()).concat(Array.from(commerce.keys())),
    )
    const hivatkozott = JSON.stringify(acrTailwind).match(/--acr-[\w-]+/g) ?? []
    expect(hivatkozott.length).toBeGreaterThan(30)
    for (const nev of hivatkozott) expect(definialt.has(nev), nev).toBe(true)
  })

  it("a 11 szovegstilus mind bekerult a Tailwind-temaba, a Figma mereteivel", () => {
    const stilusok = Object.entries(foundations.textStyles)
    expect(stilusok).toHaveLength(11)
    for (const [nev, s] of stilusok) {
      expect(acrTailwind.fontSize[`acr-${nev}`], nev).toEqual([
        `${s.size}px`,
        {
          lineHeight: `${s.lineHeight}px`,
          letterSpacing: `${s.letterSpacing}px`,
          fontWeight: String(s.weight),
        },
      ])
    }
  })
})
