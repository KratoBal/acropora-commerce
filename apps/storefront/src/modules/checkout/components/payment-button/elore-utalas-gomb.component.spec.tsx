import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/stripe", () => ({
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: vi.fn(),
}))
vi.mock("@lib/data/cart", () => ({ placeOrder: vi.fn() }))
vi.mock("@stripe/react-stripe-js", () => ({
  useElements: () => null,
  useStripe: () => null,
}))

import PaymentButton from "./index"

afterEach(cleanup)

const kosar = (providerId: string) =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [{ id: "ps-1", provider_id: providerId }],
    },
  }) as unknown as HttpTypes.StoreCart

/**
 * ELŐRE UTALÁS (kártya bb3a6bd5). A saját szolgáltatónk (`pp_acropora_transfer`)
 * egyik felismerőre sem illeszkedik, tehát a gombot a SZEREP nyitja ki, ahogy
 * az utánvétnél. A pénztárban nincs mit fizetni: a rendelés leadódik, a
 * díjbekérő az OS-ből megy.
 */
describe("a rendelés leadása előre utalással", () => {
  it("előre utalásnál leadható a rendelés", () => {
    render(
      <PaymentButton
        cart={kosar("pp_acropora_transfer")}
        fizetesiSzerep="BANK_TRANSFER"
        data-testid="submit-order-button"
      />,
    )
    const gomb = screen.getByTestId("submit-order-button") as HTMLButtonElement
    expect(gomb.textContent).toContain("Rendelés leadása")
    expect(gomb.disabled).toBe(false)
  })

  it("szerep nélkül ugyanaz a szolgáltató letiltott gombot ad", () => {
    render(
      <PaymentButton
        cart={kosar("pp_acropora_transfer")}
        data-testid="submit-order-button"
      />,
    )
    expect(screen.getByRole("button").textContent).toContain(
      "Válassz fizetési módot",
    )
  })
})
