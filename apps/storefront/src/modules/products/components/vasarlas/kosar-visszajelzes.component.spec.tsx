import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MennyisegDoboz } from "./dobozok"
import { VasarlasProvider } from "./allapot"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/products/proba",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))

const kosar = vi.hoisted(() => ({ addToCart: vi.fn() }))
vi.mock("@lib/data/cart", () => kosar)

afterEach(() => {
  cleanup()
  kosar.addToCart.mockReset()
})

/** Egy valtozat, rendelesi maximummal (a teszt bolt negy ilyen termeke kozul egy alak). */
const KORLATOS = {
  id: "prod_1",
  title: "Próba termék",
  handle: "proba",
  metadata: { unas_maximum_order_quantity: "100" },
  options: [{ id: "opt_1", title: "Kivitel" }],
  variants: [
    {
      id: "var_1",
      title: "Alap",
      options: [{ option_id: "opt_1", value: "Alap" }],
      manage_inventory: false,
    },
  ],
} as never

const lap = () =>
  render(
    <VasarlasProvider product={KORLATOS}>
      <MennyisegDoboz />
    </VasarlasProvider>,
  )

/*
  A TERMEKLAP KOSARBA TETELE A RENDELESI MAXIMUMMAL (kartya 6994c9a3). MI
  PIROSIT: a lap nem adja at a maximumot; a vagas megjegyzese vagy a tele kosar
  oka nem latszik a gomb alatt; a hiba nem „alert”, a megjegyzes nem „status”.
*/
describe("a terméklap kosárba tétele a rendelési maximumig", () => {
  it("átadja a maximumot, és a vágás okát státuszként kiírja", async () => {
    kosar.addToCart.mockResolvedValueOnce({
      ok: true,
      megjegyzes: "ezért 10 darabot tettünk a kosárba",
    })
    lap()
    fireEvent.click(screen.getByTestId("add-product-button"))
    const sor = await screen.findByTestId("kosar-visszajelzes")
    expect(sor.textContent).toMatch(/10 darabot/)
    expect(sor.getAttribute("role")).toBe("status")
    expect(kosar.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: "var_1", rendelesiMaximum: 100 }),
    )
  })

  it("a tele kosár okát figyelmeztetésként írja ki; vágás nélkül nincs sor", async () => {
    kosar.addToCart.mockResolvedValueOnce({
      ok: false,
      uzenet: "és 100 darab már a kosaradban van.",
    })
    const { unmount } = lap()
    fireEvent.click(screen.getByTestId("add-product-button"))
    const sor = await screen.findByTestId("kosar-visszajelzes")
    expect(sor.getAttribute("role")).toBe("alert")
    expect(sor.textContent).toMatch(/már a kosaradban van/)
    unmount()

    kosar.addToCart.mockResolvedValueOnce({ ok: true })
    lap()
    fireEvent.click(screen.getByTestId("add-product-button"))
    await vi.waitFor(() => expect(kosar.addToCart).toHaveBeenCalledTimes(2))
    expect(screen.queryByTestId("kosar-visszajelzes")).toBeNull()
  })
})
