import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/line-item-price", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-unit-price", () => ({
  default: () => null,
}))
vi.mock("@modules/products/components/thumbnail", () => ({
  default: () => null,
}))

import Item from "./index"

afterEach(cleanup)

/**
 * A RENDELES-VISSZAIGAZOLAS SORA A TERMEKNEVET ADJA A VALTOZATNAK IS (acrobot 49654): a sor a termek nevet adja at a
 * `LineItemOptions`-nek, ezert a termeknevvel azonos valtozatnev nem all ki ketszer. MI PIROSIT: ha a sor nem adja at a
 * termeknevet (a masolat kiirva marad); ha a valodi valtozatnev eltunik.
 */
const sor = (valtozat: string) =>
  ({
    id: "item-1",
    quantity: 1,
    product_title: "Amphiprion ocellaris (L) (Bohóchal)",
    thumbnail: null,
    variant: { id: "variant-1", title: valtozat },
  }) as never

const rajzol = (valtozat: string) =>
  render(
    <table>
      <tbody>
        <Item item={sor(valtozat)} currencyCode="huf" />
      </tbody>
    </table>,
  )

describe("a rendelés-visszaigazolás sora", () => {
  it("a terméknévvel azonos változatnév nem áll ki újra", () => {
    rajzol("Amphiprion ocellaris (L) (Bohóchal)")

    expect(screen.getByTestId("product-name").textContent).toBe(
      "Amphiprion ocellaris (L) (Bohóchal)",
    )
    expect(screen.queryByTestId("product-variant")).toBeNull()
  })

  it("a valódi változatnév előtag nélkül áll", () => {
    rajzol("200 g, fekete")

    expect(screen.getByTestId("product-variant").textContent).toBe(
      "200 g, fekete",
    )
  })
})
