import { HttpTypes } from "@medusajs/types"
import { fireEvent } from "@testing-library/dom"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let orszagKod = "hu"
const initiatePaymentSession = vi.fn()

vi.mock("@lib/data/stripe", () => ({
  valasszKartyatVegyesKosarra: vi.fn().mockResolvedValue({ ok: true }),
  inditsStripeKozosFizetest: vi.fn(),
  stripeVisszarendezes: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
  unstable_rethrow: vi.fn(),
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: (...args: unknown[]) =>
    initiatePaymentSession(...args),
  placeOrder: vi.fn(),
  mentsRendelesiNyelvet: vi.fn().mockResolvedValue({ ok: true }),
  rogzitsAszfElfogadast: vi.fn(),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi
    .fn()
    .mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "COD" }),
}))

import Payment from "./index"
import type { EngedelyezettFizetesiMod } from "@lib/util/fizetesi-modok"

afterEach(cleanup)
beforeEach(() => {
  orszagKod = "hu"
  initiatePaymentSession.mockReset()
})

/**
 * A FIZETÉSI MÓD KÉT NYELVEN. Mit mér: a módok neve és alcíme, a "nincs elérhető
 * mód" mondat és a szerver-művelet hibájának KULCSA a lap nyelvén áll; a magyar
 * mondat csak tartalék. A bankkártyás panel (Stripe) a Stripe saját felülete,
 * azt a `locale` beállítás viszi (külön spec).
 */
const REGIO = [{ id: "pp_acropora_cod" }, { id: "pp_system_default" }]
const kosar = () =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "a", country_code: "hu" },
    billing_address: { id: "b", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: [] },
  }) as unknown as HttpTypes.StoreCart

const rajzol = (modok: EngedelyezettFizetesiMod[]) =>
  render(
    <Payment
      cart={kosar()}
      availablePaymentMethods={REGIO}
      engedelyezettModok={modok}
      oldal
    />,
  )

describe("a fizetési mód nyelve", () => {
  it("magyarul a módok a régi nevükön, alcímmel", () => {
    rajzol([
      { id: "pp_acropora_cod", role: "COD" },
      { id: "pp_system_default", role: "BANK_TRANSFER" },
    ])
    expect(screen.getByText("Utánvét")).toBeTruthy()
    expect(screen.getByText("Előre utalás")).toBeTruthy()
    expect(
      screen.getByText("Díjbekérő emailben, 8 napos fizetési határidővel"),
    ).toBeTruthy()
  })

  it("angolul a módok neve és alcíme angol", () => {
    orszagKod = "en-hu"
    rajzol([
      { id: "pp_acropora_cod", role: "COD" },
      { id: "pp_system_default", role: "BANK_TRANSFER" },
    ])
    expect(screen.getByText("Cash on delivery")).toBeTruthy()
    expect(screen.getByText("Bank transfer in advance")).toBeTruthy()
    expect(
      screen.getByText("Proforma invoice by email, payable within 8 days"),
    ).toBeTruthy()
    expect(screen.queryByText("Utánvét")).toBeNull()
  })

  it("mód nélkül a mondat a lap nyelvén áll", () => {
    orszagKod = "en-hu"
    rajzol([])
    expect(screen.getByTestId("nincs-fizetesi-mod").textContent).toContain(
      "There is no payment method available",
    )
  })

  it("a szerver hibájának kulcsát a lap nyelvén írja ki", async () => {
    orszagKod = "en-hu"
    initiatePaymentSession.mockResolvedValue({
      ok: false,
      uzenet: "Ezt a fizetési módot nem tudtuk elindítani. Válassz másikat.",
      kod: "checkoutPayment.errPaymentRejected",
    })
    rajzol([{ id: "pp_acropora_cod", role: "COD" }])
    fireEvent.click(screen.getAllByRole("radio")[0])
    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain("We could not start this payment method."),
    )
  })

  it("kulcs nélküli hibánál a magyar mondat a tartalék", async () => {
    initiatePaymentSession.mockResolvedValue({
      ok: false,
      uzenet: "Régi mondat.",
    })
    rajzol([{ id: "pp_acropora_cod", role: "COD" }])
    fireEvent.click(screen.getAllByRole("radio")[0])
    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain("Régi mondat."),
    )
  })
})
