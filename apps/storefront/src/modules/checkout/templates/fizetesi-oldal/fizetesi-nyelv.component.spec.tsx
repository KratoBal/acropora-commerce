import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let osztaly: unknown = null
let orszagKod = "hu"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
}))
vi.mock("@lib/data/cart", () => ({
  retrieveCartShippingClass: vi.fn(async () => osztaly),
}))
vi.mock("@lib/data/payment", () => ({
  listCartPaymentMethods: vi.fn(async () => []),
  getCartPaymentOptions: vi.fn(async () => null),
}))
// A fizetési mód és az ÁSZF a saját specjeiben mérve; itt a lap kerete, a
// szövegek nyelve és a tájékoztató HELYE a tárgy.
vi.mock("@modules/checkout/components/payment", () => ({
  default: () => <div data-testid="fizetesi-mod" />,
}))
vi.mock("@modules/checkout/components/aszf-elfogadas", () => ({
  default: () => <div data-testid="aszf" />,
  AszfProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("@modules/checkout/components/discount-code", () => ({
  default: () => <div data-testid="kedvezmenykod" />,
}))

import FizetesiOldal from "./index"

afterEach(cleanup)
beforeEach(() => {
  osztaly = null
  orszagKod = "hu"
})

/**
 * A FIZETÉSI OLDAL KERETE KÉT NYELVEN, ÉS A TÁJÉKOZTATÓ HELYE (acrobot 40220):
 * a két rendelés sávja a megrendelés gomb helye (`penztar-cta-hely`)
 * KÖZVETLEN FÖLÖTT áll, mert a vevő a leadásnál is lássa. A sáv csak akkor
 * jelenik meg, ha a háttér megnevezett bolti sorokat.
 */
const kosar = {
  id: "cart-1",
  email: "vevo@example.test",
  currency_code: "huf",
  total: 12500,
  item_subtotal: 9000,
  item_tax_total: 0,
  shipping_subtotal: 3500,
  shipping_tax_total: 0,
  items: [
    { id: "elo", title: "Acropora austea frag", quantity: 1, total: 9000 },
    { id: "so", title: "Reef Salt", quantity: 1, total: 3500 },
  ],
  shipping_address: {
    first_name: "Minta",
    last_name: "Vevő",
    address_1: "Minta utca 12.",
    postal_code: "1111",
    city: "Budapest",
  },
  shipping_methods: [{ name: "GLS", amount: 3500, total: 3500 }],
  payment_collection: null,
} as never

describe("a fizetési oldal kerete", () => {
  it("magyarul a régi szavak állnak", async () => {
    render(await FizetesiOldal({ cart: kosar, countryCode: "hu" }))
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Fizetés",
    )
    expect(screen.getByText("Rendelés véglegesítése")).toBeTruthy()
    expect(screen.getByText("Rendelési adatok")).toBeTruthy()
  })

  it("angolul a keret és a kártyák szavai angolok", async () => {
    orszagKod = "en-hu"
    render(await FizetesiOldal({ cart: kosar, countryCode: "en-hu" }))
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Payment",
    )
    expect(screen.getByText("Place your order")).toBeTruthy()
    expect(screen.getByText("Order details")).toBeTruthy()
    expect(screen.getByText("Back to the details")).toBeTruthy()
    expect(screen.queryByText("Rendelési adatok")).toBeNull()
  })

  it("a két rendelés sávja a megrendelés gomb helye KÖZVETLEN FÖLÖTT áll", async () => {
    osztaly = { split_line_ids: ["elo"] }
    render(await FizetesiOldal({ cart: kosar, countryCode: "hu" }))
    const sav = screen.getByTestId("split-notice")
    const gombHely = document.getElementById("penztar-cta-hely")
    expect(gombHely).not.toBeNull()
    // a sáv közvetlen szülője után áll a gomb helye: nincs köztük más elem
    expect(sav.parentElement?.nextElementSibling).toBe(gombHely)
  })

  it("bolti sor nélkül nincs sáv", async () => {
    render(await FizetesiOldal({ cart: kosar, countryCode: "hu" }))
    expect(screen.queryByTestId("split-notice")).toBeNull()
    expect(document.getElementById("penztar-cta-hely")).not.toBeNull()
  })

  /**
   * EGY PÉNZTÁRBAN EGY LÉPÉSJELZŐ (acrobot 40266): a kosáré, a fizetés lépése
   * jelölve; a kedvezménykód az összesítés kártyában áll, a Fizetendő előtt,
   * mint a kosárban.
   */
  it("a kosár lépésjelzője áll, a harmadik lépés jelölve", async () => {
    render(await FizetesiOldal({ cart: kosar, countryCode: "hu" }))
    const jelzo = screen.getByTestId("cart-step-indicator")
    expect(jelzo.textContent).toContain("3 / 3 · Fizetés")
    expect(screen.queryByTestId("penztar-lepesek")).toBeNull()
  })

  it("a kedvezménykód az összesítés kártyában áll, a Fizetendő előtt", async () => {
    render(await FizetesiOldal({ cart: kosar, countryCode: "hu" }))
    const kartya = screen.getByTestId("rendelesed")
    const kod = screen.getByTestId("kedvezmenykod")
    expect(kartya.contains(kod)).toBe(true)
    expect(
      kod.compareDocumentPosition(screen.getByTestId("rendelesed-fizetendo")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
