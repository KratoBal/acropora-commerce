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

afterEach(cleanup)

/*
  A KOSAR-SOR ATHUZASA CSAK VALODI ARCSOKKENTESNEL (Omnibus 2/A., acrobot 2026-11-19: "ha a kosar sorahoz nincs meg ez az adat, a kosar
  NE huzzon at"). A sor `original_total`-ja a listaar vagy a kupon elotti osszeg, nem egy korabbi eladasi ar. MI PIROSIT: ha az
  `original_total` > `total` metaadat nelkul is athuz; ha a 30 napos legalacsonyabb ar nem nagyobb a fizetendonel, mégis athuz; ha az
  athuzott ar a listaar a referencia helyett; ha a sor osszegeben nem a darabszammal szorzott referencia all.
*/
const omnibus = (amount: string) => ({
  omnibus_lowest_price_30d: JSON.stringify({
    amount,
    currency: "huf",
    complete: true,
    history_begins: "2026-09-01",
    reduction_start: "2026-11-10",
  }),
})

function sor(
  over: {
    metadata?: Record<string, unknown> | null
    total?: number
    quantity?: number
    original?: number
  } = {},
): HttpTypes.StoreCartLineItem {
  return {
    id: "item-1",
    quantity: over.quantity ?? 2,
    product_title: "Próba termék",
    title: "Kicsi",
    product_handle: "proba-termek",
    thumbnail: null,
    total: over.total ?? 184000,
    original_total: over.original ?? 300000,
    variant: {
      id: "variant-1",
      title: "Kicsi",
      metadata: "metadata" in over ? over.metadata : null,
      product: { id: "prod-1", metadata: {}, images: [] },
    },
  } as unknown as HttpTypes.StoreCartLineItem
}

const rajzol = (item: HttpTypes.StoreCartLineItem) =>
  render(
    <table>
      <tbody>
        <Item item={item} type="full" currencyCode="huf" />
      </tbody>
    </table>,
  )

describe("a kosár sorának áthúzása", () => {
  it("metaadat nélkül nincs áthúzás, csak a fizetendő ár (az original_total nagyobb, mégsem)", () => {
    rajzol(sor())
    expect(screen.queryByTestId("product-unit-original-price")).toBeNull()
    expect(screen.queryByTestId("product-original-price")).toBeNull()
    expect(screen.getByTestId("product-price").textContent).toMatch(/184\s000/)
  })

  it("valódi árcsökkentésnél a 30 napos legalacsonyabb ár van áthúzva (egységár és sorösszeg), nem a listaár", () => {
    // 2 db, fizetendő 184 000 (92 000 / db), a 30 napos legalacsonyabb 100 000 / db, a listaár 150 000 / db
    rajzol(sor({ metadata: omnibus("100000") }))
    expect(
      screen.getByTestId("product-unit-original-price").textContent,
    ).toMatch(/100\s000/)
    expect(screen.getByTestId("product-original-price").textContent).toMatch(
      /200\s000/,
    )
  })

  it("ha a 30 napos legalacsonyabb ár nem nagyobb a fizetendőnél, nincs áthúzás", () => {
    for (const amount of ["92000", "80000"]) {
      const { unmount } = rajzol(sor({ metadata: omnibus(amount) }))
      expect(screen.queryByTestId("product-unit-original-price")).toBeNull()
      expect(screen.queryByTestId("product-original-price")).toBeNull()
      unmount()
    }
  })
})
