import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const lepes = vi.hoisted(() => ({ ertek: "step=review&fizetes=kartya" }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(lepes.ertek),
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: vi.fn(),
}))
vi.mock("@lib/data/simplepay", () => ({
  valasszKartyat: vi.fn(),
  inditsKartyasFizetest: vi.fn(),
}))
vi.mock("@lib/data/cart", () => ({ placeOrder: vi.fn() }))
vi.mock("@stripe/react-stripe-js", () => ({
  useElements: () => null,
  useStripe: () => null,
}))

import Review from "./index"

afterEach(() => {
  cleanup()
  lepes.ertek = "step=review&fizetes=kartya"
})

const kosar = {
  id: "cart-1",
  email: "vevo@example.test",
  shipping_address: { id: "addr-1", country_code: "hu" },
  billing_address: { id: "addr-2", country_code: "hu" },
  shipping_methods: [{ id: "sm-1" }],
  payment_collection: { id: "pc-1", payment_sessions: [] },
} as unknown as HttpTypes.StoreCart

/**
 * AZ ELLENORZES LEPESE ES A KARTYAS VALASZTAS (P4-4). MI PIROSIT: ha a
 * fizetesi lepes `fizetes=kartya` jelzese nem jut el a gombig.
 */
describe("az ellenőrzés lépése", () => {
  it("a kártyás jelzésre a bankkártyás gomb áll", () => {
    render(<Review cart={kosar} fizetesiSzerep={null} />)
    expect(screen.getByTestId("submit-order-button")).toHaveTextContent(
      "Fizetés bankkártyával",
    )
  })

  it("jelzés nélkül nincs bankkártyás gomb", () => {
    lepes.ertek = "step=review"
    render(<Review cart={kosar} fizetesiSzerep={null} />)
    expect(screen.queryByText("Fizetés bankkártyával")).toBeNull()
  })
})
