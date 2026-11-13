import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { TAP_AREA, TAP_AREA_TIGHT } from "@modules/common/components/tap-area"

/**
 * AZ ÉRINTÉSI TERÜLET (stage 390 px, 2026-11-13). MI PIROSIT: ha a kosár törlő ikonja, a "Kedvezménykód hozzáadása", a "Vásárlás
 * folytatása", a menü gombja vagy a pénztár "Vissza" linkje elveszítené a nagyobb találati felületet (a látható méretük 15-22 px, a
 * WCAG 2.5.8 24 px-ét nem éri el), vagy ha a közös osztály elveszítené a `::after` területet.
 * A MÉRÉS A FORRÁS (a komponens-teszt a `::after` méretét nem látja, a CSS-t a jsdom nem számolja): az osztály és a hely, ahol áll.
 */
const SRC = join(process.cwd(), "src")
const read = (path: string): string => readFileSync(join(SRC, path), "utf8")

/** A `content` globok a tailwind.config.js-bol: az osztalyokat csak az innen olvasott fajlokbol adja ki a Tailwind 3. */
const contentGlobs = (): string[] => {
  const config = readFileSync(join(process.cwd(), "tailwind.config.js"), "utf8")
  const block = /content:\s*\[([^\]]*)\]/.exec(config)
  expect(block).not.toBeNull()
  const globs: string[] = []
  const pattern = /"([^"]+)"/g
  for (let m = pattern.exec(block![1]!); m; m = pattern.exec(block![1]!))
    globs.push(m[1]!)
  return globs
}
const scannedByTailwind = (file: string): boolean =>
  contentGlobs().some((glob) => {
    const base = glob.split("/**")[0]!.replace(/^\.\//, "")
    return file.startsWith(`${base}/`) && /\.(?:js|ts|jsx|tsx)$/.test(file)
  })

describe("a kis vezérlők érintési területe", () => {
  it("az osztályokat tartalmazó fájlt a Tailwind beolvassa (különben nincs CSS, és a terület nem működik)", () => {
    // KONTROLL: a helytelen hely (a korábbi `src/lib/util/tap-area.ts`) nincs a globok alatt, a mai hely igen
    expect(scannedByTailwind("src/lib/util/tap-area.ts")).toBe(false)
    expect(
      scannedByTailwind("src/modules/common/components/tap-area/index.ts"),
    ).toBe(true)
    // és a fájl valóban ott áll, és tartalmazza az osztályokat
    expect(read("modules/common/components/tap-area/index.ts")).toContain(
      "after:-inset-y-3",
    )
  })

  it("a közös osztály átlátszó `::after` területet ad, a szülő `relative`", () => {
    expect(TAP_AREA).toContain("relative")
    expect(TAP_AREA).toContain("after:absolute")
    expect(TAP_AREA).toMatch(/after:-inset-y-\d/)
    expect(TAP_AREA).toMatch(/after:-inset-x-\d/)
  })

  it("a szűk változat (a kedvezménykód-gomb) csak 4 px-et nyúlik függőlegesen, mert alatta a kódmező áll", () => {
    expect(TAP_AREA_TIGHT).toContain("after:absolute")
    expect(TAP_AREA_TIGHT).toContain("after:-inset-y-1")
    expect(TAP_AREA_TIGHT).not.toContain("after:-inset-y-3")
  })

  it.each([
    ["modules/common/components/delete-button/index.tsx", "TAP_AREA,"],
    [
      "modules/checkout/components/discount-code/index.tsx",
      "${TAP_AREA_TIGHT}",
    ],
    ["modules/cart/templates/items.tsx", "${TAP_AREA}"],
    ["modules/layout/templates/nav/mobil-menu.tsx", "${TAP_AREA}"],
    ["app/[countryCode]/(checkout)/layout.tsx", "${TAP_AREA}"],
  ])("%s használja a közös osztályt", (path, usage) => {
    const source = read(path)
    expect(source).toContain('from "@modules/common/components/tap-area"')
    expect(source).toContain(usage)
  })
})
