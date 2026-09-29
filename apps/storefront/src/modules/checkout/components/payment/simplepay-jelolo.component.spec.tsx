import { HttpTypes } from "@medusajs/types"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi.fn().mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "COD" }),
}))

import Payment from "./index"

afterEach(cleanup)

const KARTYA = "pp_simplepay_simplepay"
const UTANVET = "pp_acropora_cod"

const kosar = (provider: string) =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: [{ provider_id: provider, status: "pending" }] },
  }) as unknown as HttpTypes.StoreCart

const lepes = (provider: string) =>
  render(
    <Payment
      cart={kosar(provider)}
      availablePaymentMethods={[{ id: KARTYA }, { id: UTANVET }]}
      engedelyezettModok={[
        { id: KARTYA, role: "ONLINE_CARD" },
        { id: UTANVET, role: "COD" },
      ]}
    />,
  )

/**
 * A NYILATKOZAT A FIZETESI LEPESBEN (P4-4). MI PIROSIT: ha a bankkartyas
 * modnal nem jelenik meg; ha elfogadas nelkul tovabb lehet menni; ha mas
 * modnal is megjelenik vagy tartja a gombot.
 */
describe("a bankkártyás mód nyilatkozata", () => {
  it("bankkártyánál megjelenik, és a Tovább az elfogadásig tiltva", () => {
    lepes(KARTYA)
    expect(screen.getByTestId("simplepay-nyilatkozat")).toBeInTheDocument()
    expect(screen.getByTestId("submit-payment-button")).toBeDisabled()

    fireEvent.click(screen.getByTestId("simplepay-nyilatkozat-jelolo"))
    expect(screen.getByTestId("submit-payment-button")).toBeEnabled()
  })

  it("más módnál nincs nyilatkozat, és a Tovább nem vár rá", () => {
    lepes(UTANVET)
    expect(screen.queryByTestId("simplepay-nyilatkozat")).toBeNull()
    expect(screen.getByTestId("submit-payment-button")).toBeEnabled()
  })
})
