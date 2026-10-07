import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const utvonal = vi.hoisted(() => ({ ertek: "/hu" }))
vi.mock("next/navigation", () => ({ usePathname: () => utvonal.ertek }))

const szerver = vi.hoisted(() => ({ kosarAllapot: vi.fn() }))
vi.mock("@lib/data/kosar-allapot", () => szerver)

import { KosarAllapotProvider, useKosarAllapot } from "./index"
import { kosarValtozott } from "./kosar-esemeny"

const Kiiro = () => {
  const { cart, betoltve } = useKosarAllapot()
  return (
    <p data-testid="allapot">
      {betoltve ? `betoltve:${cart?.id ?? "nincs"}` : "var"}
    </p>
  )
}

const allapot = () => screen.getByTestId("allapot").textContent

beforeEach(() => {
  utvonal.ertek = "/hu"
  szerver.kosarAllapot.mockResolvedValue({
    customer: null,
    cart: { id: "cart_kitalalt" },
    shippingOptions: [],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/*
  A KOSAR ES A VEVO A LAP UTAN JON (FE-7). MI PIROSIT: a szolgaltato nem kerdez
  a betolteskor; a kosarba tetel utan nem kerdez ujra (a fejlec szama regi
  marad); utvonal-valtaskor nem kerdez (a penztarbol visszajovet regi kosar);
  vagy a szerver hibaja orokre "var" allapotban hagyja a fejlecet.
*/
describe("a kliensoldali kosár-állapot", () => {
  it("betöltéskor lekéri a kosarat", async () => {
    render(
      <KosarAllapotProvider>
        <Kiiro />
      </KosarAllapotProvider>,
    )

    expect(allapot()).toBe("var")
    await waitFor(() => expect(allapot()).toBe("betoltve:cart_kitalalt"))
    expect(szerver.kosarAllapot).toHaveBeenCalledTimes(1)
  })

  it("a kosár-változás jelzésére újra kérdez", async () => {
    render(
      <KosarAllapotProvider>
        <Kiiro />
      </KosarAllapotProvider>,
    )
    await waitFor(() => expect(allapot()).toBe("betoltve:cart_kitalalt"))

    szerver.kosarAllapot.mockResolvedValue({
      customer: null,
      cart: { id: "cart_uj" },
      shippingOptions: [],
    })
    act(() => kosarValtozott())

    await waitFor(() => expect(allapot()).toBe("betoltve:cart_uj"))
    expect(szerver.kosarAllapot).toHaveBeenCalledTimes(2)
  })

  it("útvonal-váltáskor újra kérdez", async () => {
    const { rerender } = render(
      <KosarAllapotProvider>
        <Kiiro />
      </KosarAllapotProvider>,
    )
    await waitFor(() => expect(szerver.kosarAllapot).toHaveBeenCalledTimes(1))

    utvonal.ertek = "/hu/cart"
    rerender(
      <KosarAllapotProvider>
        <Kiiro />
      </KosarAllapotProvider>,
    )

    await waitFor(() => expect(szerver.kosarAllapot).toHaveBeenCalledTimes(2))
  })

  it("a szerver hibája után is betöltöttnek számít, kosár nélkül", async () => {
    szerver.kosarAllapot.mockRejectedValue(new Error("kitalalt hiba"))
    render(
      <KosarAllapotProvider>
        <Kiiro />
      </KosarAllapotProvider>,
    )

    await waitFor(() => expect(allapot()).toBe("betoltve:nincs"))
  })
})
