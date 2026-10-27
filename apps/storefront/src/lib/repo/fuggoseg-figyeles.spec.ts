// @vitest-environment node
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A FUGGOSEG-FIGYELES KONFIGJA (audit P1/12). A fajl a tarolo gyokereben all
 * (`.github/dependabot.yml`), a teszt onnan olvassa. MI PIROSIT: ha a fajl
 * eltunik (a figyeles csendben megszunik); ha a gyoker kimarad (a lockfile
 * gyokerben van); ha a Medusa-csomagok nem egy csoportban mozognak (kevert
 * verzio); ha a major frissites automata csoportba kerulne; ha a heti utemezes
 * kiesne; ha az audit-szkript kiesne a gyoker package.json-bol.
 *
 * A fajl szoveget nezzuk (nincs YAML-elemzo a kirakat fuggosegei kozott), a
 * kommentek kihagyasaval, hogy egy kommentben allo kifejezes ne szamitson.
 */
const GYOKER = join(__dirname, "..", "..", "..", "..", "..")
const FAJL = join(GYOKER, ".github", "dependabot.yml")

const konfig = () =>
  readFileSync(FAJL, "utf8")
    .split("\n")
    .filter((sor) => !/^\s*#/.test(sor))
    .join("\n")

describe("a függőség-figyelés konfigja", () => {
  it("a fájl létezik, és verzió 2", () => {
    expect(existsSync(FAJL)).toBe(true)
    expect(konfig()).toMatch(/^version:\s*2\s*$/m)
  })

  it("az npm a tároló gyökerére néz, hetente", () => {
    const k = konfig()
    expect(k).toMatch(/package-ecosystem:\s*"npm"/)
    expect(k).toMatch(/directory:\s*"\/"/)
    expect(k).toMatch(/interval:\s*"weekly"/)
  })

  it("a Medusa-csomagok egy csoportban mozognak, csak minor és patch", () => {
    const k = konfig()
    const medusa = k.slice(k.indexOf("medusa:"), k.indexOf("next-react:"))
    expect(medusa).toMatch(/"@medusajs\/\*"/)
    expect(medusa).toMatch(/"minor"/)
    expect(medusa).toMatch(/"patch"/)
    expect(medusa).not.toMatch(/"major"/)
  })

  it("a major frissítés egyik csoportba sem kerül (kézi döntés marad)", () => {
    expect(konfig()).not.toMatch(/"major"/)
  })

  it("az audit-szkript a gyökér package.json-ban áll", () => {
    const csomag = JSON.parse(
      readFileSync(join(GYOKER, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }
    expect(csomag.scripts["audit:deps"]).toContain("pnpm audit")
  })
})
