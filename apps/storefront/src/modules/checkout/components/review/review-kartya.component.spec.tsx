import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const lepes = vi.hoisted(() => ({ ertek: "step=review&fizetes=stripe" }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(lepes.ertek),
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: vi.fn(),
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
  lepes.ertek = "step=review&fizetes=stripe"
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
 * AZ ELLENORZES LEPESE ES A KARTYAS VALASZTAS. MI PIROSIT: ha a fizetesi lepes
 * jelzese nem jut el a gombig; ha a megszunt SimplePay `fizetes=kartya`
 * jelzese meg mindig gombot adna.
 */
describe("az ellenőrzés lépése", () => {
  it("a megszűnt kártyás jelzés nem ad leadó gombot, és jelzés nélkül sincs", () => {
    for (const ertek of ["step=review&fizetes=kartya", "step=review"]) {
      lepes.ertek = ertek
      render(<Review cart={kosar} fizetesiSzerep={null} />)
      expect(screen.queryByText("Rendelés leadása")).toBeNull()
      expect(screen.getByText("Válassz fizetési módot")).toBeInTheDocument()
      cleanup()
    }
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
  })
})
