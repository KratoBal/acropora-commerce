import { HttpTypes } from "@medusajs/types"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const indit = vi.hoisted(() => vi.fn())
vi.mock("@lib/data/simplepay", () => ({
  valasszKartyat: vi.fn(),
  inditsKartyasFizetest: indit,
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: vi.fn(),
}))
const placeOrder = vi.hoisted(() => vi.fn())
vi.mock("@lib/data/cart", () => ({ placeOrder }))
vi.mock("@stripe/react-stripe-js", () => ({
  useElements: () => null,
  useStripe: () => null,
}))

import PaymentButton from "./index"

const assign = vi.fn()
const eredetiLocation = window.location

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  Object.defineProperty(window, "location", {
    value: eredetiLocation,
    configurable: true,
  })
})

const kosar = {
  id: "cart-1",
  email: "vevo@example.test",
  shipping_address: { id: "addr-1", country_code: "hu" },
  billing_address: { id: "addr-2", country_code: "hu" },
  shipping_methods: [{ id: "sm-1" }],
  payment_collection: { payment_sessions: [] },
} as unknown as HttpTypes.StoreCart

/**
 * A BANKKARTYAS LEADAS (P4-4). MI PIROSIT: ha a kartyas valasztasnal nem a
 * SimplePay gomb all; ha a gomb rendelest ad le a fizetes helyett; ha nem a
 * hatter adta cimre visz; ha a hibat nem mondja ki.
 */
describe("a bankkártyás leadás", () => {
  it("elindítja a fizetést, és a SimplePay oldalára visz; rendelést nem ad le", async () => {
    Object.defineProperty(window, "location", {
      value: { assign },
      configurable: true,
    })
    indit.mockResolvedValue({
      ok: true,
      cim: "https://sandbox.simplepay.hu/pay/x",
    })
    render(
      <PaymentButton cart={kosar} kartyas data-testid="submit-order-button" />,
    )

    const gomb = screen.getByTestId("submit-order-button")
    expect(gomb).toHaveTextContent("Fizetés bankkártyával")
    fireEvent.click(gomb)

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://sandbox.simplepay.hu/pay/x"),
    )
    expect(indit).toHaveBeenCalledWith("cart-1")
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("ha nem indul, kimondja, és nem visz sehova", async () => {
    Object.defineProperty(window, "location", {
      value: { assign },
      configurable: true,
    })
    indit.mockResolvedValue({
      ok: false,
      uzenet: "Az élő állat miatt a kosarad két rendelésre bomlik",
    })
    render(
      <PaymentButton cart={kosar} kartyas data-testid="submit-order-button" />,
    )

    fireEvent.click(screen.getByTestId("submit-order-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("simplepay-payment-error-message"),
      ).toHaveTextContent("két rendelésre bomlik"),
    )
    expect(assign).not.toHaveBeenCalled()
  })

  it("kártyás jelzés nélkül nincs SimplePay gomb", () => {
    render(<PaymentButton cart={kosar} data-testid="submit-order-button" />)
    expect(screen.queryByText("Fizetés bankkártyával")).toBeNull()
  })
})
