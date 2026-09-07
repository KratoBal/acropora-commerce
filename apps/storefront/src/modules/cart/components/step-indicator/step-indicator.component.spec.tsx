import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import StepIndicator, { CART_STEPS } from "./index"

afterEach(cleanup)

/**
 * A LEPES-JELZO EGYETLEN DOLGOT ALLIT: HOL TART A VEVO.
 *
 * A ket alak (mobil rovid, asztali teljes) UGYANABBOL az adatbol szuletik.
 * Ha kulon lennenek beirva, a ket hely kulon romlana el, es a lapon ket
 * kulonbozo lepesszam allna -- csendben, mert egyszerre csak az egyik latszik.
 */
describe("a kosár lépés-jelzője", () => {
  it("mindhárom lépés nevét kiírja, a tervben álló sorrendben", () => {
    render(<StepIndicator active={0} />)

    const jelzo = screen.getByTestId("cart-step-indicator")
    for (const lepes of CART_STEPS) {
      expect(jelzo).toHaveTextContent(lepes)
    }
  })

  /**
   * AZ AKTIV LEPEST A `aria-current` MONDJA MEG, nem a szin: a szin nem
   * olvashato fel, es a kepernyoolvaso hasznaloja ugyanugy tudni akarja, hol
   * tart. Ezert erre allitunk, nem az osztalynevre.
   */
  it("az aktív lépés meg van jelölve, és pontosan egy", () => {
    render(<StepIndicator active={1} />)

    const aktiv = screen
      .getByTestId("cart-step-indicator")
      .querySelectorAll('[aria-current="step"]')
    expect(aktiv.length).toBe(1)
    expect(aktiv[0]?.textContent).toBe(CART_STEPS[1])
  })

  it("a rövid alak ugyanazt a lépést mondja, mint a teljes", () => {
    render(<StepIndicator active={2} />)

    expect(screen.getByTestId("cart-step-indicator")).toHaveTextContent(
      `3 / 3 · ${CART_STEPS[2]}`,
    )
  })
})
