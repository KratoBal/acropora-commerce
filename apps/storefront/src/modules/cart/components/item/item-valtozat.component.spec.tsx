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
function sor(
  variantTitle: string | null,
  termekNev = "Próba termék",
): HttpTypes.StoreCartLineItem {
  return {
    id: "item-1",
    quantity: 1,
    product_title: termekNev,
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

const rajzol = (variantTitle: string | null, termekNev?: string) =>
  render(
    <table>
      <tbody>
        <Item item={sor(variantTitle, termekNev)} currencyCode="huf" />
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

  /**
   * A TERMEKNEV MASOLATA SEM VALTOZAT (acrobot 49644, a teszt kosaron merve): az importalt egyvaltozatu elo allat
   * valtozatanak cime szo szerint a termeknev, es a sor ketszer irta ki ("Amphiprion ocellaris (L) (Bohochal)").
   * MI PIROSIT: ha a termeknevvel egyezo valtozatnev kiirva marad; ha egy MAS valtozatnev tunik el vele.
   */
  it("a terméknévvel azonos változatnév nem jelenik meg", () => {
    rajzol(
      "Amphiprion ocellaris (L) (Bohóchal)",
      "Amphiprion ocellaris (L) (Bohóchal)",
    )

    expect(screen.getByTestId("product-title").textContent).toBe(
      "Amphiprion ocellaris (L) (Bohóchal)",
    )
    expect(screen.queryByTestId("product-variant")).toBeNull()
  })

  it("az egyezés betűzéstől és szóköztől független, de más név megmarad", () => {
    expect(
      valtozatNev("  amphiprion  OCELLARIS (L) ", "Amphiprion ocellaris (L)"),
    ).toBeNull()
    expect(
      valtozatNev("Amphiprion ocellaris (L)", "Amphiprion ocellaris (M)"),
    ).toBe("Amphiprion ocellaris (L)")
    expect(valtozatNev("200 g, fekete", "Próba termék")).toBe("200 g, fekete")
    // terméknév nélkül (a régi hívás alakja) a viselkedés változatlan
    expect(valtozatNev("200 g, fekete")).toBe("200 g, fekete")
  })
})
