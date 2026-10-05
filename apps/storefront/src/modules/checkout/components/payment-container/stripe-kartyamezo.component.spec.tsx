import { RadioGroup } from "@headlessui/react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="stripe-kartyamezo" />,
}))

import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import { StripePaymentContainer } from "./index"

afterEach(cleanup)

const rajzol = (kivalasztott: string | null) =>
  render(
    <StripeContext.Provider value={true}>
      <RadioGroup value={kivalasztott} onChange={() => {}}>
        <StripePaymentContainer
          paymentProviderId="pp_stripe_stripe"
          selectedPaymentOptionId={kivalasztott}
          paymentInfoMap={{
            pp_stripe_stripe: { title: "Bankkártyás fizetés", icon: <span /> },
          }}
          setError={() => {}}
          setPaymentComplete={() => {}}
          egyFizetes="Egy fizetés · 22 500 Ft"
        />
      </RadioGroup>
    </StripeContext.Provider>,
  )

/**
 * A BANKKARTYAS MOD A KERETEK SZERINT (desktop 209:3, mobil 209:133). MI
 * PIROSIT: a Stripe hivatalos szovegjele helyett barmi mas (vagy semmi); a
 * mezo nem KOZVETLENUL a kivalasztott mod alatt all, vagy nem kivalasztott
 * modnal is megjelenik; a bizalmi mondat nem szo szerinti; hianyzik az "Egy
 * fizetés" sor; a "Kártya · Apple Pay · Google Pay" alcim.
 */
describe("a Stripe kártyamező", () => {
  it("kiválasztva: cím, alcím, a Stripe szövegjele, alatta a mező, a bizalmi mondat és az egy fizetés", () => {
    rajzol("pp_stripe_stripe")
    expect(screen.getByText("Bankkártyás fizetés")).toBeInTheDocument()
    expect(
      screen.getByText("Kártya · Apple Pay · Google Pay"),
    ).toBeInTheDocument()
    const logo = screen.getByTestId("stripe-logo")
    expect(logo).toHaveAttribute("alt", "Stripe")
    expect(logo.getAttribute("src")).toContain("stripe-wordmark-blurple.svg")
    expect(screen.getByTestId("kivalasztva-cimke")).toBeInTheDocument()
    const panel = screen.getByTestId("stripe-panel")
    expect(panel).toContainElement(screen.getByTestId("stripe-kartyamezo"))
    expect(screen.getByTestId("stripe-bizalmi-szoveg")).toHaveTextContent(
      "A kártyaadatokat a Stripe biztonságos fizetési rendszere kezeli; az Acropora nem fér hozzá a kártyaadataidhoz.",
    )
    expect(screen.getByTestId("egy-fizetes")).toHaveTextContent(
      "Egy fizetés · 22 500 Ft",
    )
  })

  it("nem kiválasztva: a kártya áll, a mező és a panel nem", () => {
    rajzol("pp_acropora_cod")
    expect(screen.getByText("Bankkártyás fizetés")).toBeInTheDocument()
    expect(screen.queryByTestId("stripe-panel")).toBeNull()
    expect(screen.queryByTestId("kivalasztva-cimke")).toBeNull()
  })
})
