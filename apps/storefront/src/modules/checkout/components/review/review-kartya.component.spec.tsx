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
import { MEGRENDEL_GOMB_FELIRAT } from "@lib/util/megrendeles"

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
      expect(screen.queryByText(MEGRENDEL_GOMB_FELIRAT)).toBeNull()
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
      MEGRENDEL_GOMB_FELIRAT,
    )
  })
})

/**
 * A KÉT RENDELÉS SÁVJA A TÉNYLEGES LEADÁS GOMBJA FÖLÖTT (acrobot 40266): az
 * ellenőrzés lépésben áll a megrendelés gomb. MI PIROSÍT: ha a sáv a gomb után
 * állna, vagy a lépés nem rajzolná ki a kapott sávot, vagy kapu nélkül (zárt
 * lépésben) is látszana.
 */
describe("a sáv az ellenőrzés lépésben", () => {
  const sav = <section data-testid="split-notice">két rendelés</section>

  it("a megerősítő mondat ÉS a gomb előtt áll", () => {
    lepes.ertek = "step=review&fizetes=stripe"
    render(<Review cart={kosar} fizetesiSzerep={null} ertesites={sav} />)
    const savElem = screen.getByTestId("split-notice")
    const mondat = screen.getByText(/A rendelés leadásával megerősíted/)
    const gomb = screen.getByTestId("submit-order-button")
    expect(
      savElem.compareDocumentPosition(mondat) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      savElem.compareDocumentPosition(gomb) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("zárt lépésben (nem az ellenőrzés) a sáv sem látszik", () => {
    lepes.ertek = "step=delivery"
    render(<Review cart={kosar} fizetesiSzerep={null} ertesites={sav} />)
    expect(screen.queryByTestId("split-notice")).toBeNull()
  })

  it("sáv nélkül nincs üres doboz sem", () => {
    lepes.ertek = "step=review&fizetes=stripe"
    const { container } = render(<Review cart={kosar} fizetesiSzerep={null} />)
    expect(container.querySelector('[data-testid="split-notice"]')).toBeNull()
  })
})
