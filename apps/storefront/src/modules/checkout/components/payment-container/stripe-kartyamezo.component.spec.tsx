import { RadioGroup } from "@headlessui/react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="stripe-kartyamezo" />,
}))

import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import { StripePaymentContainer } from "./index"

afterEach(cleanup)

/**
 * A STRIPE KARTYAMEZO FELIRATA MAGYARUL (a sablon angol mondata helyett). MI
 * PIROSIT: ha a vevo angol szoveget olvasna a magyar penztarban.
 */
describe("a Stripe kártyamező", () => {
  it("betöltött Stripe mellett magyar felirattal áll", () => {
    render(
      <StripeContext.Provider value={true}>
        <RadioGroup value="pp_stripe_stripe" onChange={() => {}}>
          <StripePaymentContainer
            paymentProviderId="pp_stripe_stripe"
            selectedPaymentOptionId="pp_stripe_stripe"
            paymentInfoMap={{
              pp_stripe_stripe: {
                title: "Bankkártyás fizetés (Stripe)",
                icon: <span />,
              },
            }}
            setError={() => {}}
            setPaymentComplete={() => {}}
          />
        </RadioGroup>
      </StripeContext.Provider>,
    )
    expect(screen.getByTestId("stripe-kartyamezo")).toBeInTheDocument()
    expect(screen.getByText("A kártya adatai:")).toBeInTheDocument()
  })
})
