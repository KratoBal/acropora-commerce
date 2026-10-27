import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import resolveConfig from "tailwindcss/resolveConfig"

import tailwindConfig from "../../tailwind.config"

/**
 * A NARANCS KET SZEREPE (Balázs, 2026-10-27, commerce-audit-p1, "D" valtozat):
 * a fehér betus felulet #b05a1b (fehéren 4,86:1), a narancs szoveg vilagos
 * hatteren #a8561a (5,05:1). A Figma `heritage` (#d5782f) fehéren és világos
 * hátteren is 3,09:1 volt. EGY HELYEN all (acropora-tokens.css), a Tailwind
 * `bg-acr-heritage` / `text-acr-heritage` osztalyok azokra mutatnak, ezert a
 * ~60 hivohely valtozatlan.
 */
const css = readFileSync(join(__dirname, "acropora-tokens.css"), "utf8")

function blokk(szelektor: string): Map<string, string> {
  const kezdet = css.indexOf(szelektor + " {")
  expect(kezdet, `nincs ilyen blokk: ${szelektor}`).toBeGreaterThanOrEqual(0)
  const torzs = css.slice(kezdet, css.indexOf("\n}", kezdet))
  return new Map(
    Array.from(torzs.matchAll(/(--acr-[\w-]+):\s*([^;]+);/g)).map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}

const vilagos = blokk(':root,\n[data-vilag="vilagos"]')
const sotet = blokk(
  '[data-vilag="sotet"],\nbody:has([data-vilag="sotet"]) [data-fejlec],\nbody:has([data-acr-mod="reef"]) [data-fejlec]',
)

const fenyero = (hex: string) => {
  const csat = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * csat[0] + 0.7152 * csat[1] + 0.0722 * csat[2]
}
const kontraszt = (a: string, b: string) => {
  const [x, y] = [fenyero(a), fenyero(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe("a narancs ket szerepe", () => {
  it("a fehér betus felulet-narancs fehéren legalabb 4,5:1", () => {
    const ertek = vilagos.get("--acr-cta-bg")
    expect(ertek).toBe("#b05a1b")
    expect(kontraszt("#ffffff", ertek as string)).toBeGreaterThanOrEqual(4.5)
  })

  it("a narancs szoveg a vilagos lapokon legalabb 4,5:1 (shell es feher)", () => {
    const ertek = vilagos.get("--acr-heritage-text")
    expect(ertek).toBe("#a8561a")
    for (const lap of ["#fbfbf9", "#ffffff"])
      expect(kontraszt(ertek as string, lap), lap).toBeGreaterThanOrEqual(4.5)
  })

  it("a sotet vilagban a szoveg-narancs a Figma-szin, a felulet ugyanaz", () => {
    expect(sotet.get("--acr-heritage-text")).toBe("var(--acr-color-heritage)")
    expect(sotet.get("--acr-cta-bg")).toBe(vilagos.get("--acr-cta-bg"))
  })

  it("a Tailwind osztalyok a ket szerepre mutatnak, a keret a Figma-szinen marad", () => {
    const tema = resolveConfig(tailwindConfig as never).theme as unknown as {
      backgroundColor: Record<string, Record<string, string>>
      textColor: Record<string, Record<string, string>>
      borderColor: Record<string, Record<string, string>>
    }
    expect(tema.backgroundColor.acr.heritage).toBe("var(--acr-cta-bg)")
    expect(tema.textColor.acr.heritage).toBe("var(--acr-heritage-text)")
    expect(tema.borderColor.acr.heritage).toBe("var(--acr-color-heritage)")
  })

  it("a termeklap Kosarba-felulete (`--terv-kiemel`) is a felulet-narancs", () => {
    const kezdet = css.indexOf('[data-vilag="vilagos"] {\n  --terv-hatter')
    expect(kezdet).toBeGreaterThanOrEqual(0)
    const torzs = css.slice(kezdet, css.indexOf("\n}", kezdet))
    expect(torzs).toMatch(/--terv-kiemel:\s*var\(--acr-cta-bg\);/)
  })
})
