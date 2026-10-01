import { HttpTypes } from "@medusajs/types"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/simplepay", () => ({
  valasszKartyat: vi.fn().mockResolvedValue({ ok: true }),
  inditsKartyasFizetest: vi.fn(),
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

const SIMPLEPAY = "pp_simplepay_simplepay"
const STRIPE = "pp_stripe_stripe"

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
      availablePaymentMethods={[{ id: SIMPLEPAY }, { id: STRIPE }]}
      engedelyezettModok={[
        { id: SIMPLEPAY, role: "ONLINE_CARD" },
        { id: STRIPE, role: "ONLINE_CARD" },
      ]}
    />,
  )

/**
 * STRIPE A SIMPLEPAY MELLETT (Balazs 2026-09-30, csak a teszt kirakaton). MI
 * PIROSIT: ha a ket kartyas mod egyforma felirattal allna; ha a Stripe a
 * SimplePay utjat jarna (nyilatkozat, munkamenet nelkul); ha a SimplePay
 * elkezdene munkamenetet inditani; ha kulcs nelkul is megjelenne a Stripe.
 */
describe("két kártyás mód a fizetési lépésben", () => {
  it("mindkettő megjelenik, a Stripe megkülönböztetve", () => {
    lepes()
    expect(screen.getByText("Bankkártyás fizetés")).toBeInTheDocument()
    expect(screen.getByText("Bankkártyás fizetés (Stripe)")).toBeInTheDocument()
  })

  it("a Stripe választása munkamenetet indít, és nincs SimplePay nyilatkozat", async () => {
    lepes()
    fireEvent.click(screen.getByText("Bankkártyás fizetés (Stripe)"))
    await waitFor(() =>
      expect(initiatePaymentSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cart-1" }),
        { provider_id: STRIPE },
      ),
    )
    expect(screen.queryByTestId("simplepay-nyilatkozat")).toBeNull()
  })

  it("a SimplePay választása továbbra sem indít munkamenetet, és kéri a nyilatkozatot", async () => {
    lepes()
    fireEvent.click(screen.getByText("Bankkártyás fizetés"))
    await waitFor(() =>
      expect(screen.getByTestId("simplepay-nyilatkozat")).toBeInTheDocument(),
    )
    expect(initiatePaymentSession).not.toHaveBeenCalled()
  })

  it("publikus kulcs nélkül a Stripe nem jelenik meg", () => {
    kulcs.ertek = ""
    lepes()
    expect(screen.getByText("Bankkártyás fizetés")).toBeInTheDocument()
    expect(screen.queryByText("Bankkártyás fizetés (Stripe)")).toBeNull()
  })
})
