import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/hu/termek/kitalalt",
  useParams: () => ({ countryCode: "hu" }),
}))
vi.mock("@modules/common/components/delete-button", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-options", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-price", () => ({
  default: () => null,
}))
vi.mock("@modules/products/components/thumbnail", () => ({
  default: () => null,
}))

import CartDropdown from "./index"

afterEach(cleanup)

const kosar = (darab: number) =>
  ({
    id: "cart_kitalalt",
    subtotal: 1000 * darab,
    currency_code: "huf",
    items: [
      {
        id: "item_kitalalt",
        quantity: darab,
        title: "Kitalált termék",
        product_handle: "kitalalt",
        created_at: "2026-10-07T00:00:00Z",
      },
    ],
  }) as never

const nyitva = () => screen.queryByTestId("nav-cart-dropdown") !== null

/*
  A KOSAR MOST A LAP UTAN JON (FE-7). Az elso megerkezes 0-rol N-re visz, es a
  legordulo eddig minden darabszam-valtozasra kinyilt -- tehat minden
  lapbetolteskor kinyilt volna, akinek van kosara. MI PIROSIT: az elso
  megerkezes kinyitja; vagy a valodi valtozas (kosarba tetel) mar nem nyitja.
*/
describe("a kosár-legördülő a kliensoldali betöltés után", () => {
  it("az első megérkezésre nem nyílik ki", () => {
    const { rerender } = render(<CartDropdown cart={null} betoltve={false} />)
    rerender(<CartDropdown cart={kosar(2)} betoltve />)

    expect(nyitva()).toBe(false)
  })

  it("a betöltés utáni változásra kinyílik", () => {
    const { rerender } = render(<CartDropdown cart={null} betoltve={false} />)
    rerender(<CartDropdown cart={kosar(2)} betoltve />)
    act(() => {
      rerender(<CartDropdown cart={kosar(3)} betoltve />)
    })

    expect(nyitva()).toBe(true)
  })
})
