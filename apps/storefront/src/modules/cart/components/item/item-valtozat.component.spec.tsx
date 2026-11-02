import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

vi.mock("@lib/data/cart", () => ({
  updateLineItem: vi.fn(),
  deleteLineItem: vi.fn(async () => undefined),
}))

import Item from "./index"
import { valtozatNev } from "./valtozat"

afterEach(cleanup)

/**
 * A MEDUSA `Default` NEVE NEM JELENIK MEG A KOSARSORBAN.
 *
 * MI PIROSIT: ha a sor megint kiirja az alapertelmezett valtozat nevet (az
 * Acropora austea es a Hanna sor a kosar-elonezeten `Default`-ot mutatott), vagy
 * ha egy VALODI valtozatnev (meret, kiszereles) tunik el vele egyutt.
 *
 * A fixture csak azt tolti ki, amit a sor olvas (lasd az `item-hiba` suite-ot).
 */
function sor(variantTitle: string | null): HttpTypes.StoreCartLineItem {
  return {
    id: "item-1",
    quantity: 1,
    product_title: "Próba termék",
    product_handle: "proba-termek",
    thumbnail: null,
    total: 1000,
    original_total: 1000,
    variant: {
      id: "variant-1",
      title: variantTitle,
      product: { id: "prod-1", metadata: {}, images: [] },
    },
  } as unknown as HttpTypes.StoreCartLineItem
}

const rajzol = (variantTitle: string | null) =>
  render(
    <table>
      <tbody>
        <Item item={sor(variantTitle)} currencyCode="huf" />
      </tbody>
    </table>,
  )

describe("a valtozat neve a kosarsorban", () => {
  /** ISMERT POZITIV KONTROLL: valodi valtozatnev megjelenik. */
  it("a valódi változatnév kiírva áll", () => {
    rajzol("200 g, fekete")

    expect(screen.getByTestId("product-variant").textContent).toBe(
      "200 g, fekete",
    )
  })

  it("a Default nem jelenik meg", () => {
    rajzol("Default")

    expect(screen.getByTestId("product-row")).toBeTruthy()
    expect(screen.queryByTestId("product-variant")).toBeNull()
  })

  it("a Default betűzéstől és szóköztől függetlenül nem jelenik meg", () => {
    expect(valtozatNev(" default ")).toBeNull()
    expect(valtozatNev("DEFAULT")).toBeNull()
    expect(valtozatNev("")).toBeNull()
    expect(valtozatNev(null)).toBeNull()
  })

  it("a Default-ot tartalmazó valódi név megmarad", () => {
    expect(valtozatNev("Default Edition 2 l")).toBe("Default Edition 2 l")
  })
})
