import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { TAP_AREA } from "./tap-area"

/**
 * AZ ÉRINTÉSI TERÜLET (stage 390 px, 2026-11-13). MI PIROSIT: ha a kosár törlő ikonja, a "Kedvezménykód hozzáadása", a "Vásárlás
 * folytatása", a menü gombja vagy a pénztár "Vissza" linkje elveszítené a nagyobb találati felületet (a látható méretük 15-22 px, a
 * WCAG 2.5.8 24 px-ét nem éri el), vagy ha a közös osztály elveszítené a `::after` területet.
 * A MÉRÉS A FORRÁS (a komponens-teszt a `::after` méretét nem látja, a CSS-t a jsdom nem számolja): az osztály és a hely, ahol áll.
 */
const SRC = join(process.cwd(), "src")
const read = (path: string): string => readFileSync(join(SRC, path), "utf8")

describe("a kis vezérlők érintési területe", () => {
  it("a közös osztály átlátszó `::after` területet ad, a szülő `relative`", () => {
    expect(TAP_AREA).toContain("relative")
    expect(TAP_AREA).toContain("after:absolute")
    expect(TAP_AREA).toMatch(/after:-inset-y-\d/)
    expect(TAP_AREA).toMatch(/after:-inset-x-\d/)
  })

  it.each([
    ["modules/common/components/delete-button/index.tsx", "TAP_AREA,"],
    ["modules/checkout/components/discount-code/index.tsx", "${TAP_AREA}"],
    ["modules/cart/templates/items.tsx", "${TAP_AREA}"],
    ["modules/layout/templates/nav/mobil-menu.tsx", "${TAP_AREA}"],
    ["app/[countryCode]/(checkout)/layout.tsx", "${TAP_AREA}"],
  ])("%s használja a közös osztályt", (path, usage) => {
    const source = read(path)
    expect(source).toContain('from "@lib/util/tap-area"')
    expect(source).toContain(usage)
  })
})
