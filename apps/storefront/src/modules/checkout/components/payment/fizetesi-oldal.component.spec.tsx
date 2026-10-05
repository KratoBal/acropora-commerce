import { HttpTypes } from "@medusajs/types"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/stripe", () => ({
  valasszKartyatVegyesKosarra: vi.fn().mockResolvedValue({ ok: true }),
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
  unstable_rethrow: () => {},
}))
const cartMock = vi.hoisted(() => ({
  rogzitsAszfElfogadast: vi.fn(),
  placeOrder: vi.fn(),
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
  placeOrder: cartMock.placeOrder,
  rogzitsAszfElfogadast: cartMock.rogzitsAszfElfogadast,
}))
const stripeMock = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi
    .fn()
    .mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "ONLINE_CARD" }),
}))
vi.mock("@lib/util/stripe-kulcs", () => ({
  STRIPE_PUBLIKUS_KULCS: "pk_test_helyi_proba",
}))
// a Stripe csonkjai: a gyors fizetes `ready` esemenye egy Apple Pay-es eszkozt mond
const tarca = vi.hoisted(() => ({ van: true }))
vi.mock("@stripe/react-stripe-js", async () => {
  const { useEffect } = await import("react")
  return {
    PaymentElement: () => <div data-testid="stripe-kartyamezo" />,
    ExpressCheckoutElement: ({
      onReady,
    }: {
      onReady: (e: unknown) => void
    }) => {
      useEffect(() => {
        onReady({
          elementType: "expressCheckout",
          availablePaymentMethods: tarca.van
            ? {
                applePay: true,
                googlePay: false,
                link: false,
                paypal: false,
                amazonPay: false,
                klarna: false,
              }
            : undefined,
        })
      }, [onReady])
      return <div data-testid="stripe-express" />
    },
    useStripe: () => stripeMock,
    useElements: () => ({ getElement: () => null }),
  }
})

import { AszfProvider } from "@modules/checkout/components/aszf-elfogadas"
import AszfNegyzet from "@modules/checkout/components/aszf-elfogadas"
import { StripeContext } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import { PENZTAR_CTA_HELY } from "@modules/checkout/components/rendelesed"

import Payment from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  tarca.van = true
})

const STRIPE = "pp_stripe_stripe"

const kosar = () =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    total: 45190,
    currency_code: "huf",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [
        { id: "ps-1", provider_id: STRIPE, status: "pending", data: {} },
      ],
    },
  }) as unknown as HttpTypes.StoreCart

const oldal = () =>
  render(
    <StripeContext.Provider value={true}>
      <AszfProvider>
        <Payment
          cart={kosar()}
          oldal
          availablePaymentMethods={[{ id: STRIPE }]}
          engedelyezettModok={[{ id: STRIPE, role: "ONLINE_CARD" }]}
        />
        <AszfNegyzet />
        <div id={PENZTAR_CTA_HELY} data-testid="cta-hely" />
      </AszfProvider>
    </StripeContext.Provider>,
  )

/**
 * A FIGMA SZERINTI FIZETESI OLDAL (209:3 / 209:133). MI PIROSIT: ha a gomb nem
 * az osszesitobe kerul; ha az ASZF pipa nelkul leadhato a rendeles, vagy a
 * gyors fizetes kattinthato; ha a pipa utan is tiltva marad; ha a gyors fizetes
 * tarca nelkul is helyet foglal; ha a lepes sajat cime megmarad a kartyan belul.
 */
describe("a fizetési oldal", () => {
  it("a leadó gomb az összesítőbe kerül, a választott mód címkéjével", async () => {
    oldal()
    const hely = screen.getByTestId("cta-hely")
    const gomb = await screen.findByTestId("submit-order-button")
    expect(hely.contains(gomb)).toBe(true)
    expect(hely.contains(screen.getByTestId("valasztott-fizetes"))).toBe(true)
    expect(screen.getByTestId("valasztott-fizetes").textContent).toBe(
      "FizetésBankkártya",
    )
  })

  it("az ÁSZF pipa nélkül a gomb és a gyors fizetés tiltva, pipával mehet", async () => {
    oldal()
    const gomb = (await screen.findByTestId(
      "submit-order-button",
    )) as HTMLButtonElement
    expect(gomb.disabled).toBe(true)
    expect(screen.getByTestId("aszf-hianyzik")).toBeInTheDocument()
    expect(screen.getByTestId("express-tiltva")).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId("aszf-pipa"))
    })
    expect(gomb.disabled).toBe(false)
    expect(screen.queryByTestId("aszf-hianyzik")).toBeNull()
    expect(screen.queryByTestId("express-tiltva")).toBeNull()
  })

  it("a gyors fizetés tárcával látszik, tárca nélkül nem foglal helyet", async () => {
    oldal()
    expect(
      screen.getByTestId("express-fizetes").getAttribute("data-lathato"),
    ).toBe("true")
    cleanup()
    tarca.van = false
    oldal()
    expect(
      screen.getByTestId("express-fizetes").getAttribute("data-lathato"),
    ).toBe("false")
    expect(screen.getByTestId("express-fizetes").className).toContain(
      "invisible",
    )
  })

  it("a lépés saját címe nem jelenik meg (a kártya adja)", () => {
    oldal()
    const cim = screen.getByRole("heading", { name: "Fizetés" })
    expect(cim.parentElement?.className).toContain("hidden")
  })

  /**
   * AZ ASZF A KOSARRA KERUL, MIELOTT A FIZETES INDUL (kartya 4a2b252d). MI
   * PIROSIT: ha a megerosites a rogzites elott, vagy nelkule indulna; ha a
   * rogzites hibaja utan is lenne fizetes.
   */
  it("a leadás előbb az ÁSZF-et rögzíti a kosáron, aztán erősít meg", async () => {
    cartMock.rogzitsAszfElfogadast.mockResolvedValue({ ok: true })
    stripeMock.confirmPayment.mockResolvedValue({
      error: { type: "card_error", message: "elutasitva" },
    })
    oldal()
    await act(async () => {
      fireEvent.click(screen.getByTestId("aszf-pipa"))
    })
    await act(async () => {
      fireEvent.click(await screen.findByTestId("submit-order-button"))
    })
    expect(cartMock.rogzitsAszfElfogadast).toHaveBeenCalledWith("cart-1")
    expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1)
    expect(
      cartMock.rogzitsAszfElfogadast.mock.invocationCallOrder[0],
    ).toBeLessThan(stripeMock.confirmPayment.mock.invocationCallOrder[0])
  })

  it("ha a rögzítés nem sikerül, nincs fizetés, és a hiba kiíródik", async () => {
    cartMock.rogzitsAszfElfogadast.mockResolvedValue({
      ok: false,
      uzenet: "Az ÁSZF elfogadását most nem sikerült rögzíteni.",
    })
    oldal()
    await act(async () => {
      fireEvent.click(screen.getByTestId("aszf-pipa"))
    })
    await act(async () => {
      fireEvent.click(await screen.findByTestId("submit-order-button"))
    })
    expect(stripeMock.confirmPayment).not.toHaveBeenCalled()
    expect(
      await screen.findByText(
        "Az ÁSZF elfogadását most nem sikerült rögzíteni.",
      ),
    ).toBeInTheDocument()
  })
})
