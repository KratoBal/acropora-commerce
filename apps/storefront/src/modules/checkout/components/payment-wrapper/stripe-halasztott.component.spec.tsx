import { cleanup, render, screen } from "@testing-library/react"
import { HttpTypes } from "@medusajs/types"
import { afterEach, describe, expect, it, vi } from "vitest"

const elements = vi.hoisted(() => ({ options: [] as unknown[] }))
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: (props: { options: unknown; children: React.ReactNode }) => {
    elements.options.push(props.options)
    return <div data-testid="elements">{props.children}</div>
  },
}))
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}))
vi.mock("@lib/util/stripe-kulcs", () => ({
  STRIPE_PUBLIKUS_KULCS: "pk_test_helyi_proba",
}))

import PaymentWrapper from "./index"

afterEach(() => {
  cleanup()
  elements.options.length = 0
})

const kosar = {
  id: "cart-1",
  total: 21950,
  currency_code: "huf",
  payment_collection: { payment_sessions: [] },
} as unknown as HttpTypes.StoreCart

/**
 * A HALASZTOTT KÁRTYAMEZŐ (Balázs 2026-10-01, 1-es út). MI PIROSÍT: ha a
 * vegyes kosár Stripe-ja nem kapna kártyamezőt; ha a mező beállítása eltérne
 * a közös intenttől (összeg, pénznem, csak kártya, kézi levonás); ha egy nem
 * vegyes, munkamenet nélküli kosár is kapna.
 */
describe("PaymentWrapper, vegyes kosár", () => {
  it("halasztott kártyamezőt ad, az intenttel egyező beállítással", () => {
    render(
      <PaymentWrapper cart={kosar} vegyesStripe>
        <span>pénztár</span>
      </PaymentWrapper>,
    )
    expect(screen.getByTestId("elements")).toHaveTextContent("pénztár")
    expect(elements.options).toEqual([
      {
        mode: "payment",
        amount: 2_195_000,
        currency: "huf",
        captureMethod: "manual",
        paymentMethodTypes: ["card"],
      },
    ])
  })

  it("nem vegyes kosár munkamenet nélkül: nincs kártyamező", () => {
    render(
      <PaymentWrapper cart={kosar}>
        <span>pénztár</span>
      </PaymentWrapper>,
    )
    expect(screen.queryByTestId("elements")).toBeNull()
    expect(screen.getByText("pénztár")).toBeInTheDocument()
  })
})
