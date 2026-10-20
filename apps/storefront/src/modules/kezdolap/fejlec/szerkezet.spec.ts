import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A FEJLEC CELPONTJAI (WCAG 2.5.8, a CI axe `target-size` szabalya).
 *
 * A kosar-link maga 17 pixel magas (13 pixeles szoveg), a CI a kezdolapon egy
 * `.leading-[17px]` celpontot buktatott. A jsdom nem szamol elrendezest, ezert a
 * SZERKEZETET meri: a kosar-link a 44 pixel magas tabletta-burkoloban all, a
 * Fiokom link legalabb 24 pixel magas.
 *
 * MI PIROSIT: a kosar-link burkolo nelkul marad, vagy a tabletta magassaga
 * kisebb 24 pixelnel; a Fiokom link elveszti a `min-h-6`-ot.
 */
const forras = readFileSync(join(__dirname, "index.tsx"), "utf-8")

describe("a fejléc érintési céljai", () => {
  it("a kosár-link a 44 pixeles tablettában áll", () => {
    const burkolo = forras.match(
      /data-testid="kl-kosar"[\s\S]{0,900}?<CartButton/,
    )
    expect(burkolo, "a CartButton a kl-kosar burkoloban all").not.toBeNull()
    expect(burkolo?.[0]).toContain("[&_[data-testid=nav-cart-link]]:h-11")
    expect(burkolo?.[0]).toContain("[&_[data-testid=nav-cart-link]]:min-w-11")
    // CSAK a kosar-link lesz tabletta: a lenyilo panel tetel-linkjei nem (barracuda, #556)
    expect(burkolo?.[0]).not.toMatch(/\[&_a\]/)
  })

  it("a Fiókom link legalább 24 pixel magas", () => {
    expect(forras).toMatch(/data-testid="kl-fiok"/)
    const fiok = forras.match(
      /<LocalizedClientLink\s+href="\/account"[\s\S]*?data-testid="kl-fiok"/,
    )
    expect(fiok?.[0]).toContain("min-h-6")
  })
})
