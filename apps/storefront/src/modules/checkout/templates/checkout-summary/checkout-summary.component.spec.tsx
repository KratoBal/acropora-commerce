import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let orszagKod = "hu"

vi.mock("@lib/data/cart", () => ({
  retrieveCartShippingClass: vi.fn(),
  applyPromotions: vi.fn(),
  updateLineItem: vi.fn(),
  deleteLineItem: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
}))

import { CheckoutSummaryView } from "./index"

afterEach(cleanup)
beforeEach(() => {
  orszagKod = "hu"
})

/**
 * A PÉNZTÁR OLDALSÁVJA. Mit mér: a tételek ELŐBB állnak, mint a két rendelés
 * sávja (acrobot 40169, a kosár sorrendje), a sáv csak akkor jelenik meg, ha a
 * háttér megnevezett bolti sorokat, és a fejléc a szótárból jön.
 *
 * A fixture számai összeadnak: 2 x 4500 + 1 x 12900 = 21900 tétel, 3500
 * szállítás, 25400 a fizetendő.
 */
const sor = (id: string, db: number, egyseg: number, perc: number) => ({
  id,
  product_title: id,
  product_handle: id,
  quantity: db,
  total: db * egyseg,
  original_total: db * egyseg,
  thumbnail: null,
  created_at: new Date(Date.now() - perc * 60000).toISOString(),
  variant: { title: "100 ml", product: { images: [], metadata: {} } },
})
const kosar = {
  id: "cart-1",
  currency_code: "huf",
  items: [sor("elo-korall", 2, 4500, 5), sor("tapszer", 1, 12900, 2)],
  item_subtotal: 21900 / 1.27,
  item_tax_total: 21900 - 21900 / 1.27,
  shipping_subtotal: 3500 / 1.27,
  shipping_tax_total: 3500 - 3500 / 1.27,
  tax_total: 25400 - 25400 / 1.27,
  total: 25400,
  promotions: [],
} as never

describe("a pénztár oldalsávja", () => {
  it("magyarul: fejléc, és a tételek a sáv ELŐTT állnak", () => {
    render(
      <CheckoutSummaryView
        cart={kosar}
        countryCode="hu"
        szallitasiOsztaly={{ split_line_ids: ["elo-korall"] }}
      />,
    )
    expect(screen.getByText("A kosaradban")).toBeTruthy()
    const sav = screen.getByTestId("split-notice")
    const elsoSor = screen.getAllByTestId("product-row")[0]
    expect(
      elsoSor.compareDocumentPosition(sav) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByTestId("cart-total")).toHaveAttribute(
      "data-value",
      "25400",
    )
  })

  it("a sáv nélkül a háttér nem nevezett bolti sort", () => {
    render(
      <CheckoutSummaryView
        cart={kosar}
        countryCode="hu"
        szallitasiOsztaly={null}
      />,
    )
    expect(screen.queryByTestId("split-notice")).toBeNull()
  })

  it("angolul a fejléc és az összegek angolok", () => {
    orszagKod = "en-hu"
    render(
      <CheckoutSummaryView
        cart={kosar}
        countryCode="en-hu"
        szallitasiOsztaly={null}
      />,
    )
    expect(screen.getByText("In your cart")).toBeTruthy()
    expect(screen.getByText("Total to pay")).toBeTruthy()
    expect(screen.queryByText("Fizetendő")).toBeNull()
  })

  it("az ellenőrzés lépésben a sáv nem ismétlődik az oldalsávban (a gomb fölött áll)", () => {
    render(
      <CheckoutSummaryView
        cart={kosar}
        countryCode="hu"
        szallitasiOsztaly={{ split_line_ids: ["elo-korall"] }}
        savMutat={false}
      />,
    )
    expect(screen.queryByTestId("split-notice")).toBeNull()
    expect(screen.getByTestId("cart-total")).toBeTruthy()
  })
})
