import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import SkeletonProductGrid from "./index"

afterEach(cleanup)

/**
 * A HELYORZOK SZAMA, ES AMIERT EZ MOST MERNI KELL.
 *
 * A kategoria- es a gyujtemeny-lap a `*products` mezot CSAK a helyorzok
 * darabszamahoz kerte, es az a mezo a katalogus meretevel egyutt nott (a
 * gyoker kategorian 3,96 MB). A mezo kikerul; a kerdes az, mi lesz a szam.
 *
 * A KATEGORIA-OLDAL `?? 8` alakban ir tartalekot; a GYUJTEMENY-oldal NEM.
 * Elsore ugy latszik, hogy ott a szam `undefined` lesz -- de a komponens
 * SAJAT alapertelmezese 8, es egy default parameter EPP `undefined` eseten
 * sul el.
 *
 * Ez az allitas azt meri, hogy ez tenyleg igy van, nem azt, hogy logikusnak
 * hangzik.
 */
describe("a betöltési helyőrzők száma", () => {
  it("megadott szám esetén annyit rajzol", () => {
    render(<SkeletonProductGrid numberOfProducts={3} />)

    expect(screen.getByTestId("products-list-loader").children).toHaveLength(3)
  })

  /**
   * A LENYEG: `undefined` eseten a KOMPONENS alapertelmezese all be, nem egy
   * ures racs. Ha ez elromlik, a gyujtemeny-lap betoltese ures marad, es az
   * NEM hibazik -- csak nem latszik semmi.
   */
  it("undefined esetén a komponens alapértelmezése áll be (8)", () => {
    render(<SkeletonProductGrid numberOfProducts={undefined} />)

    expect(screen.getByTestId("products-list-loader").children).toHaveLength(8)
  })

  it("megadás nélkül ugyanaz a nyolc", () => {
    render(<SkeletonProductGrid />)

    expect(screen.getByTestId("products-list-loader").children).toHaveLength(8)
  })
})
