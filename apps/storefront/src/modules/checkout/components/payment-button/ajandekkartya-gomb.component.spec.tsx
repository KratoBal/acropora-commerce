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
import { MEGRENDEL_GOMB_FELIRAT } from "@lib/util/megrendeles"

afterEach(cleanup)

/** Kész a kosár, a fizetési munkamenet nélkül (a jóváírás utáni frissítés a régit eldobta). */
const kosar = (total: number, credit_lines: unknown[]) =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    total,
    credit_lines,
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: null,
  }) as unknown as HttpTypes.StoreCart

const kartya = {
  amount: 31140,
  reference: "gift_card",
  metadata: { code_last4: "H4BW" },
}

/**
 * A KÁRTYA MINDENT FIZET (495c0007; barracuda, #822). Munkamenet nélkül a gomb eddig a „Válassz fizetési módot” ágra
 * esett, tehát aki a teljes összeget kártyával fizette, nem tudott rendelni. MI PIROSÍT: a teljes fedezésnél a gomb
 * letiltva marad; egy részleges fedezés vagy egy nem-ajándékkártya jóváírás munkamenet nélkül leadható gombot kap.
 */
describe("a rendelés leadása, ha az ajándékkártya mindent fizet", () => {
  it("nulla végösszeg, kártya-jóváírás, munkamenet nélkül: a gomb leadható", () => {
    render(
      <PaymentButton
        cart={kosar(0, [kartya])}
        data-testid="submit-order-button"
      />,
    )
    const gomb = screen.getByTestId("submit-order-button") as HTMLButtonElement
    expect(gomb.textContent).toContain(MEGRENDEL_GOMB_FELIRAT)
    expect(gomb.disabled).toBe(false)
  })

  it("részleges fedezés munkamenet nélkül: fizetési módot kell választani", () => {
    render(
      <PaymentButton
        cart={kosar(6700, [kartya])}
        data-testid="submit-order-button"
      />,
    )
    expect(screen.getByRole("button").textContent).toContain(
      "Válassz fizetési módot",
    )
  })

  it("nulla végösszeg, de nem ajándékkártya-jóváírás: nem ez az ág", () => {
    render(
      <PaymentButton
        cart={kosar(0, [{ amount: 31140, reference: "loyalty" }])}
        data-testid="submit-order-button"
      />,
    )
    expect(screen.getByRole("button").textContent).toContain(
      "Válassz fizetési módot",
    )
  })
})
