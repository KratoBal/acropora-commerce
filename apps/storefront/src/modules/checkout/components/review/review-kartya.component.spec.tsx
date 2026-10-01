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
// a vegyes kosar Stripe-utjanak szerver-muveletei (a `server-only` orzo miatt mock)
vi.mock("@lib/data/stripe", () => ({
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
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

  /*
    VEGYES KOSÁR, STRIPE (Balázs 2026-10-01): a fizetési lépés `fizetes=stripe`
    jelzése a közös Stripe-fizetés gombjához visz. MI PIROSÍT: ha a jelzés nem
    jutna el a gombig (a vevő a „Válassz fizetési módot” tiltott gombját látná).
  */
  it("a Stripe-jelzésre a közös Stripe-fizetés gombja áll", () => {
    lepes.ertek = "step=review&fizetes=stripe"
    render(<Review cart={kosar} fizetesiSzerep={null} />)
    expect(screen.getByTestId("submit-order-button")).toHaveTextContent(
      "Rendelés leadása",
    )
    expect(screen.queryByText("Fizetés bankkártyával")).toBeNull()
  })
})
