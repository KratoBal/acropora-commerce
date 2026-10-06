import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/cart", () => ({
  retrieveCartShippingClass: vi.fn(async () => null),
}))
vi.mock("@lib/data/payment", () => ({
  listCartPaymentMethods: vi.fn(async () => []),
  getCartPaymentOptions: vi.fn(async () => null),
}))
// A fizetesi mod a sajat specjeiben merve (a bankkartya panelje a mondattal);
// itt a lap keretet nezzuk, ezert a reszek helyett jelolok allnak.
vi.mock("@modules/checkout/components/payment", () => ({
  default: () => <div data-testid="fizetesi-mod" />,
}))
vi.mock("@modules/checkout/components/aszf-elfogadas", () => ({
  default: () => <div data-testid="aszf" />,
  AszfProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("@modules/checkout/components/penztar-lepesek", () => ({
  default: () => null,
}))
vi.mock("@modules/checkout/components/rendelesi-adatok", () => ({
  default: () => null,
}))
vi.mock("@modules/checkout/components/rendelesed", () => ({
  default: () => null,
}))
vi.mock("@modules/checkout/components/szallitasi-csoportok", () => ({
  default: () => null,
}))
vi.mock("@modules/checkout/components/discount-code", () => ({
  default: () => null,
}))

import FizetesiOldal from "./index"

afterEach(cleanup)

/**
 * A STRIPE BIZALMI MONDATA (acrobot 27110). MI PIROSIT: a "Rendelés
 * véglegesítése" kartyan, ami minden fizetesi modnal latszik (utanvet, elore
 * utalas, bolti fizetes), ujra megjelenik a kartyaadatokrol szolo mondat.
 */
describe("a fizetési oldal véglegesítése", () => {
  it("az ÁSZF-et kéri, a kártyaadatokról szóló mondat nélkül", async () => {
    render(await FizetesiOldal({ cart: { id: "cart_1" } as never }))
    const veglegesites = screen.getByTestId("veglegesites")
    expect(within(veglegesites).getByTestId("aszf")).toBeInTheDocument()
    expect(screen.getByTestId("fizetesi-mod")).toBeInTheDocument()
    expect(screen.queryByText(/kártyaadatokat/)).toBeNull()
  })
})
