import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LineItemOptions from "./index"

afterEach(cleanup)

/**
 * A VALTOZAT NEVE A RENDELES-VISSZAIGAZOLAS SORAIBAN (acrobot 49654, barracuda #754): a sor "Variant: " elotaggal, angolul es
 * a termeknev masolataval egyutt irta ki a valtozatot. MI PIROSIT: ha az angol elotag visszajon; ha a termeknevvel egyezo
 * valtozatnev (vagy a `Default`) kiirva marad; ha egy valodi valtozatnev eltunik.
 */
const valtozat = (title: string | null) => ({ id: "variant-1", title }) as never

describe("a változat neve a visszaigazolás soraiban", () => {
  it("a valódi változatnév előtag nélkül áll", () => {
    render(
      <LineItemOptions
        variant={valtozat("200 g, fekete")}
        termekNev="Próba termék"
        data-testid="product-variant"
      />,
    )

    expect(screen.getByTestId("product-variant").textContent).toBe(
      "200 g, fekete",
    )
  })

  it("a terméknévvel azonos változatnév és a Default nem jelenik meg", () => {
    render(
      <LineItemOptions
        variant={valtozat("Amphiprion ocellaris (L) (Bohóchal)")}
        termekNev="Amphiprion ocellaris (L) (Bohóchal)"
        data-testid="product-variant"
      />,
    )
    expect(screen.queryByTestId("product-variant")).toBeNull()

    cleanup()
    render(
      <LineItemOptions
        variant={valtozat("Default")}
        termekNev="Próba termék"
        data-testid="product-variant"
      />,
    )
    expect(screen.queryByTestId("product-variant")).toBeNull()
  })

  it("változat nélkül nincs sor", () => {
    render(
      <LineItemOptions
        variant={undefined}
        termekNev="Próba termék"
        data-testid="product-variant"
      />,
    )
    expect(screen.queryByTestId("product-variant")).toBeNull()
  })
})
