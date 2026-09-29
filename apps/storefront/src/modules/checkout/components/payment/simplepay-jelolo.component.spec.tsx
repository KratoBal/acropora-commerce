import { HttpTypes } from "@medusajs/types"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// A bankkartyas szerver-muveletek (P4-4): a teszt-kornyezetben a `server-only`
// orzo miatt nem toltodhetnek be, ezert mock.
vi.mock("@lib/data/simplepay", () => ({
  valasszKartyat: vi.fn().mockResolvedValue({ ok: true }),
  inditsKartyasFizetest: vi.fn(),
}))

const lepesNeve = vi.hoisted(() => ({ ertek: "payment" }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(`step=${lepesNeve.ertek}`),
}))
vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: vi
    .fn()
    .mockResolvedValue({ ok: true, dij: 0, valasztottSzerep: "COD" }),
}))

import { initiatePaymentSession } from "@lib/data/cart"
import { valasszKartyat } from "@lib/data/simplepay"
import { waitFor } from "@testing-library/react"

import Payment from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  lepesNeve.ertek = "payment"
})

const KARTYA = "pp_simplepay_simplepay"
const UTANVET = "pp_acropora_cod"

const kosar = (provider: string) =>
  ({
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [{ provider_id: provider, status: "pending" }],
    },
  }) as unknown as HttpTypes.StoreCart

const lepesElem = (provider: string) => (
  <Payment
    cart={kosar(provider)}
    availablePaymentMethods={[{ id: KARTYA }, { id: UTANVET }]}
    engedelyezettModok={[
      { id: KARTYA, role: "ONLINE_CARD" },
      { id: UTANVET, role: "COD" },
    ]}
  />
)
const lepes = (provider: string) => render(lepesElem(provider))

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

  it("a lépés újranyitásakor az elfogadást újra kéri", () => {
    const { rerender } = lepes(KARTYA)
    fireEvent.click(screen.getByTestId("simplepay-nyilatkozat-jelolo"))
    expect(screen.getByTestId("submit-payment-button")).toBeEnabled()

    lepesNeve.ertek = "review"
    rerender(lepesElem(KARTYA))
    lepesNeve.ertek = "payment"
    rerender(lepesElem(KARTYA))

    expect(screen.getByTestId("simplepay-nyilatkozat-jelolo")).not.toBeChecked()
    expect(screen.getByTestId("submit-payment-button")).toBeDisabled()
  })

  /**
   * A SORREND (P4-4): a kartya valasztasa nem indit semmit; a "Tovabb" a
   * hattert keri, hogy vegye le a regi munkamenetet es a dijat, es az
   * ellenorzesre a kartyas jelzessel visz. MI PIROSIT: munkamenet a pipa
   * elott; a "Tovabb" a kartyas jelzes nelkul; mas modnal a jelzes megmarad.
   */
  it("a bankkártya választása nem indít munkamenetet", async () => {
    lepes(UTANVET)
    fireEvent.click(screen.getByText("Bankkártyás fizetés"))
    await waitFor(() =>
      expect(screen.getByTestId("simplepay-nyilatkozat")).toBeInTheDocument(),
    )
    expect(initiatePaymentSession).not.toHaveBeenCalled()
  })

  it("a Tovább a pipa után a háttérrel leveteti a régit, és kártyásként visz az ellenőrzésre", async () => {
    lepes(KARTYA)
    fireEvent.click(screen.getByTestId("simplepay-nyilatkozat-jelolo"))
    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() => expect(router.push).toHaveBeenCalled())
    expect(valasszKartyat).toHaveBeenCalledWith("cart-1")
    expect(initiatePaymentSession).not.toHaveBeenCalled()
    const cel = new URLSearchParams(
      String(router.push.mock.calls[0][0]).split("?")[1],
    )
    expect(cel.get("step")).toBe("review")
    expect(cel.get("fizetes")).toBe("kartya")
  })

  it("más módnál a kártyás jelzés lekerül", async () => {
    lepesNeve.ertek = "payment&fizetes=kartya"
    lepes(UTANVET)
    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() => expect(router.push).toHaveBeenCalled())
    const cel = new URLSearchParams(
      String(router.push.mock.calls[0][0]).split("?")[1],
    )
    expect(cel.get("step")).toBe("review")
    expect(cel.get("fizetes")).toBeNull()
    expect(valasszKartyat).not.toHaveBeenCalled()
  })
})
