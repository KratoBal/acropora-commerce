import { HttpTypes } from "@medusajs/types"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/stripe", () => ({
  valasszKartyatVegyesKosarra: vi.fn().mockResolvedValue({ ok: true }),
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
}))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams("step=payment"),
  unstable_rethrow: () => {},
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
  placeOrder: vi.fn(),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi
    .fn()
    .mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "ONLINE_CARD" }),
}))
vi.mock("@lib/util/stripe-kulcs", () => ({
  STRIPE_PUBLIKUS_KULCS: "pk_test_helyi_proba",
}))
// a halasztott kartyamezo: kitoltve jelez
vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: ({
    onChange,
  }: {
    onChange: (e: { complete: boolean }) => void
  }) => {
    useEffect(() => onChange({ complete: true }), [onChange])
    return <div data-testid="kartyamezo" />
  },
  useStripe: () => ({}),
  useElements: () => ({}),
}))

import { initiatePaymentSession } from "@lib/data/cart"
import { valasszKartyatVegyesKosarra } from "@lib/data/stripe"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import Payment from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const STRIPE = "pp_stripe_stripe"

const kosar = {
  id: "cart-1",
  email: "vevo@example.test",
  shipping_address: { id: "a1", country_code: "hu" },
  billing_address: { id: "a2", country_code: "hu" },
  shipping_methods: [{ id: "sm-1" }],
  payment_collection: { payment_sessions: [] },
} as unknown as HttpTypes.StoreCart

/**
 * VEGYES KOSÁR, STRIPE (Balázs 2026-10-01, 1-es út; a redesign 2026-10-05).
 * MI PIROSÍT: ha a Stripe választása munkamenetet indítana (a kosár már a
 * fizetési lépésben bomlana, és a vevő elveszítené az élő állatot az
 * összegzőből); ha a korábbi munkamenet és az utánvét-díj nem kerülne le a
 * választáskor (a mező alatt rossz összeg állna); ha a leadó gomb nem a
 * fizetési lépésben, a közös Stripe-fizetés gombjaként állna; ha az "Egy
 * fizetés" sor nem mondaná ki, hogy a két rendelés együtt.
 */
describe("a fizetési lépés vegyes kosárnál", () => {
  it("a Stripe választása nem indít munkamenetet, leveszi a régit, és a közös gomb a lépésben áll", async () => {
    render(
      <StripeContext.Provider value={true}>
        <Payment
          cart={{ ...kosar, total: 22500, currency_code: "huf" } as never}
          vegyes
          availablePaymentMethods={[{ id: STRIPE }]}
          engedelyezettModok={[{ id: STRIPE, role: "ONLINE_CARD" }]}
        />
      </StripeContext.Provider>,
    )
    fireEvent.click(screen.getByText("Bankkártyás fizetés"))
    await screen.findByTestId("kartyamezo")
    await waitFor(() =>
      expect(valasszKartyatVegyesKosarra).toHaveBeenCalledWith("cart-1"),
    )
    expect(router.refresh).toHaveBeenCalled()
    expect(initiatePaymentSession).not.toHaveBeenCalled()

    expect(screen.getByTestId("submit-order-button")).toHaveTextContent(
      "Rendelés leadása",
    )
    expect(screen.queryByTestId("submit-payment-button")).toBeNull()
    expect(screen.getByTestId("egy-fizetes").textContent).toMatch(
      /^Egy fizetés · a két rendelés együtt · 22\s500\sFt$/,
    )
  })
})
