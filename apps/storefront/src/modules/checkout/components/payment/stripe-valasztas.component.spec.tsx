import { HttpTypes } from "@medusajs/types"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// A Stripe szerver-muveletei: a teszt-kornyezetben a `server-only` orzo miatt
// nem toltodhetnek be, ezert mock.
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
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi
    .fn()
    .mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "ONLINE_CARD" }),
}))
const kulcs = vi.hoisted(() => ({ ertek: "pk_test_helyi_proba" }))
vi.mock("@lib/util/stripe-kulcs", () => ({
  get STRIPE_PUBLIKUS_KULCS() {
    return kulcs.ertek
  },
}))

import { initiatePaymentSession } from "@lib/data/cart"

import Payment from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  kulcs.ertek = "pk_test_helyi_proba"
})

const STRIPE = "pp_stripe_stripe"
const COD = "pp_acropora_cod"

const kosar = () =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: [] },
  }) as unknown as HttpTypes.StoreCart

const lepes = () =>
  render(
    <Payment
      cart={kosar()}
      availablePaymentMethods={[{ id: STRIPE }, { id: COD }]}
      engedelyezettModok={[
        { id: STRIPE, role: "ONLINE_CARD" },
        { id: COD, role: "COD" },
      ]}
    />,
  )

/**
 * A STRIPE AZ EGYETLEN KARTYAS MOD (Balazs 2026-10-05). MI PIROSIT: ha a
 * kartyas sor nem a szerep feliratat viselne; ha a Stripe valasztasa nem
 * inditana munkamenetet (a kartyamezo nem kapna titkot); ha kulcs nelkul is
 * megjelenne a Stripe.
 */
describe("a kártyás mód a fizetési lépésben", () => {
  it("a Stripe a szerep feliratával jelenik meg, megkülönböztetés nélkül", () => {
    lepes()
    expect(screen.getByText("Bankkártyás fizetés")).toBeInTheDocument()
    expect(screen.queryByText("Bankkártyás fizetés (Stripe)")).toBeNull()
  })

  it("a Stripe választása munkamenetet indít", async () => {
    lepes()
    fireEvent.click(screen.getByText("Bankkártyás fizetés"))
    await waitFor(() =>
      expect(initiatePaymentSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cart-1" }),
        { provider_id: STRIPE },
      ),
    )
  })

  it("publikus kulcs nélkül a Stripe nem jelenik meg", () => {
    kulcs.ertek = ""
    lepes()
    expect(screen.queryByText("Bankkártyás fizetés")).toBeNull()
    expect(screen.getByText("Utánvét")).toBeInTheDocument()
  })
})
