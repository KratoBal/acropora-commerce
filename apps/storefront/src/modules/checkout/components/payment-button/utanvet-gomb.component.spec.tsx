import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: vi.fn(),
}))

vi.mock("@lib/data/cart", () => ({
  placeOrder: vi.fn(),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  useElements: () => null,
  useStripe: () => null,
}))

import PaymentButton from "./index"

afterEach(cleanup)

function kosar(providerId: string) {
  return {
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [{ id: "ps-1", provider_id: providerId }],
    },
  } as unknown as HttpTypes.StoreCart
}

describe("a rendelés leadása utánvéttel", () => {
  /**
   * A MÉRT ÁLLAPOT, AMIT EZ JAVÍT: a saját utánvét-szolgáltatónk egyik
   * felismerőre sem illeszkedett (`isStripeLike`, `isManual`), tehát a gomb a
   * `default:` ágra esett, és LETILTVA maradt. A vevő egy érvényes fizetési
   * mód mellett nem tudott rendelést leadni.
   */
  it("utánvétnél leadható a rendelés", () => {
    render(
      <PaymentButton
        cart={kosar("pp_acropora_cod")}
        fizetesiSzerep="COD"
        data-testid="submit-order-button"
      />,
    )

    const gomb = screen.getByTestId("submit-order-button") as HTMLButtonElement

    expect(gomb.textContent).toContain("Rendelés leadása")
    expect(gomb.disabled).toBe(false)
  })

  /**
   * A MÁSIK IRÁNY: szerep nélkül ugyanaz a szolgáltató továbbra is a letiltott
   * ágra esik. Enélkül nem tudnánk, hogy a SZEREP nyitotta ki a gombot, és nem
   * valami más.
   */
  it("szerep nélkül ugyanaz a szolgáltató letiltott gombot ad", () => {
    render(
      <PaymentButton
        cart={kosar("pp_acropora_cod")}
        data-testid="submit-order-button"
      />,
    )

    expect(screen.getByRole("button").textContent).toContain(
      "Válassz fizetési módot",
    )
  })

  it("munkamenet nélkül a COD szerep sem ad leadható gombot", () => {
    const uresKosar = {
      ...kosar("pp_acropora_cod"),
      payment_collection: { payment_sessions: [] },
    } as unknown as HttpTypes.StoreCart

    render(
      <PaymentButton
        cart={uresKosar}
        fizetesiSzerep="COD"
        data-testid="submit-order-button"
      />,
    )

    expect(screen.getByRole("button").textContent).toContain(
      "Válassz fizetési módot",
    )
  })

  it("a bolti fizetés ága változatlanul leadható marad", () => {
    render(
      <PaymentButton
        cart={kosar("pp_system_default")}
        fizetesiSzerep="PAY_AT_STORE"
        data-testid="submit-order-button"
      />,
    )

    expect(screen.getByTestId("submit-order-button").textContent).toContain(
      "Rendelés leadása",
    )
  })
})
