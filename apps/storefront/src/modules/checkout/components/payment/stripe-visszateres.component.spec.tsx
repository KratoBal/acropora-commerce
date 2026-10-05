import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const kereso = vi.hoisted(() => ({ ertek: "step=payment&ellenorzes=1" }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(kereso.ertek),
  unstable_rethrow: () => {},
}))
vi.mock("@lib/data/stripe", () => ({
  valasszKartyatVegyesKosarra: vi.fn(),
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
  placeOrder: vi.fn(),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi.fn(),
}))
vi.mock("@lib/util/stripe-kulcs", () => ({
  STRIPE_PUBLIKUS_KULCS: "pk_test_helyi_proba",
}))
vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="kartyamezo" />,
  useStripe: () => ({}),
  useElements: () => ({}),
}))

import { placeOrder } from "@lib/data/cart"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import Payment from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const STRIPE = "pp_stripe_stripe"
const kosar = (munkamenetek: unknown[]) =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    total: 14000,
    currency_code: "huf",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: munkamenetek },
  }) as unknown as HttpTypes.StoreCart

const rajzol = (munkamenetek: unknown[] = []) =>
  render(
    <StripeContext.Provider value={true}>
      <Payment
        cart={kosar(munkamenetek)}
        availablePaymentMethods={[{ id: STRIPE }]}
        engedelyezettModok={[{ id: STRIPE, role: "ONLINE_CARD" }]}
      />
    </StripeContext.Provider>,
  )

/**
 * A 3DS UTANI VISSZATERES A FIZETESI LEPESBEN (477:619 / 477:1217, 477:315).
 * MI PIROSIT: a visszatero vevo a sima penztarat latja az ellenorzes helyett;
 * a leadas nem indul el; egy sikertelen leadas utan az ellenorzes allapot
 * beragad; a bank elutasitasa utan nem a rogzitett mondat es "Próbáld újra"
 * all.
 */
describe("a fizetési lépés a 3DS után", () => {
  it("ellenorzes=1: „Fizetés ellenőrzése…”, a gomb „Ellenőrzés…”, és a leadás indul", async () => {
    kereso.ertek = "step=payment&ellenorzes=1"
    vi.mocked(placeOrder).mockReturnValue(new Promise(() => {}))
    rajzol()
    expect(screen.getByText("Fizetés ellenőrzése…")).toBeInTheDocument()
    expect(
      screen.getByText("A banki hitelesítés eredményét ellenőrizzük."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ellenőrzés…" })).toBeDisabled()
    await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId("submit-payment-button")).toBeNull()
  })

  it("ha a leadás nem sikerül, az ellenőrzés nem ragad be, és a hiba látszik", async () => {
    kereso.ertek = "step=payment&ellenorzes=1"
    vi.mocked(placeOrder).mockResolvedValue({
      ok: false,
      uzenet: "A rendelést most nem sikerült leadni.",
    } as never)
    rajzol()
    expect(
      await screen.findByText("A rendelést most nem sikerült leadni."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Fizetés ellenőrzése…")).toBeNull()
  })

  it("redirect_status=failed: a rögzített mondat a mező alatt, a gomb „Próbáld újra”", () => {
    kereso.ertek = "step=payment&redirect_status=failed"
    rajzol([
      {
        id: "ps_1",
        provider_id: STRIPE,
        status: "pending",
        data: { client_secret: "cs_1" },
      },
    ])
    expect(screen.getByTestId("stripe-elutasitva")).toHaveTextContent(
      "A kártyás fizetés nem sikerült. Próbáld újra vagy válassz másik fizetési módot.",
    )
    expect(screen.getByTestId("submit-order-button")).toHaveTextContent(
      "Próbáld újra",
    )
  })
})
