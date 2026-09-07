import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import UniquePieceBadge, { UniquePiecePromise } from "./index"

afterEach(cleanup)

/**
 * A JELVÉNY ÉS AZ ÍGÉRET-MONDAT KÉT KÜLÖN ELEM, ÉS EZ SZÁNDÉKOS.
 *
 * A jelvény a képen BELÜL áll (abszolút pozícióval), a mondat a kép ALATT. Egy
 * komponensbe téve a mondat a jelvény pozicionálását örökölné, és a képre
 * csúszna. A két állítás azt rögzíti, hogy mindkettő KÜLÖN kirajzolható.
 */
describe("az egyedi példány jelölése", () => {
  it("a jelvény felirata a WYSIWYG-ígéretet jelöli", () => {
    render(<UniquePieceBadge />)
    expect(screen.getByTestId("unique-piece-badge")).toHaveTextContent(
      "Egyedi példány",
    )
  })

  it("az ígéret-mondat kimondja, mit kap a vevő", () => {
    render(<UniquePiecePromise />)
    expect(screen.getByTestId("unique-piece-promise")).toHaveTextContent(
      "ezt kapod, nem egy hasonlót",
    )
  })
})
