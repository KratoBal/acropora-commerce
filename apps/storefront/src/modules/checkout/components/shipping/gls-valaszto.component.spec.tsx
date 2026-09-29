import { HttpTypes } from "@medusajs/types"
import { act, cleanup, render, screen } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setShippingMethod = vi.fn()
const searchFoxpostPickupPoints = vi.fn()
const searchGlsPickupPoints = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=delivery"),
}))
vi.mock("@lib/data/cart", () => ({
  setShippingMethod: (...args: unknown[]) => setShippingMethod(...args),
}))
vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))
vi.mock("@lib/data/csomagpont", () => ({
  searchFoxpostPickupPoints: (...args: unknown[]) => searchFoxpostPickupPoints(...args),
  searchGlsPickupPoints: (...args: unknown[]) => searchGlsPickupPoints(...args),
}))

import Shipping from "./index"

afterEach(cleanup)
beforeEach(() => {
  setShippingMethod.mockReset()
  searchFoxpostPickupPoints.mockReset()
  searchGlsPickupPoints.mockReset()
})

const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 1990,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  }) as unknown as HttpTypes.StoreCartShippingOption

const kosar = (modok: unknown[] = []) =>
  ({
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: modok,
    currency_code: "huf",
  }) as unknown as HttpTypes.StoreCart

const rajzol = (k = kosar()) =>
  render(
    <Shipping
      cart={k}
      availableShippingMethods={[
        mod("so-home", "GLS házhozszállítás"),
        mod("so-gls", "GLS csomagpont"),
        mod("so-gls-heavy", "GLS nehézáru csomagpont"),
        mod("so-fox", "Foxpost csomagpont"),
      ]}
      foxpostOptionId="so-fox"
      glsOptions={[
        { option_id: "so-gls", heavy: false },
        { option_id: "so-gls-heavy", heavy: true },
      ]}
    />,
  )

const radio = (n: number) => screen.getAllByTestId("delivery-option-radio")[n]

/**
 * A GLS-CSOMAGPONT VÁLASZTÓ (P4), a Foxposttal egy úton. MI PIROSIT: ha a GLS
 * csomagpontos mód pont nélkül beállna; ha a keresés nem a kiválasztott mód
 * azonosítójával menne (a nehézárus csak csomagboltot kaphat, a háttér dönt);
 * ha a pont nem a `gls_pickup_point` adatban menne; ha a házhozszállítás is
 * választót nyitna; ha a kosárban álló GLS-pont nem látszik.
 */
describe("a GLS-csomagpont választó", () => {
  it("a GLS csomagpont a GLS választót nyitja, a házhozszállítás nem", () => {
    rajzol()
    setShippingMethod.mockResolvedValue({ ok: true })
    fireEvent.click(radio(0))
    expect(screen.queryByTestId("csomagpont-valaszto")).toBeNull()
    fireEvent.click(radio(1))
    expect(screen.getByTestId("csomagpont-valaszto").textContent).toContain(
      "Válaszd ki, melyik GLS csomagpontba kéred a csomagot.",
    )
  })

  it("a keresés a mód azonosítójával megy, és a pont a GLS adatában kerül a módra", async () => {
    searchGlsPickupPoints.mockResolvedValue({
      elerheto: true,
      pontok: [{ id: "SHOP1", name: "Bolt", address: "2100 Gödöllő, Fő tér 1.", zip: "2100", city: "Gödöllő" }],
      talalat: 1,
    })
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(radio(2))
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), { target: { value: "2100" } })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(searchGlsPickupPoints).toHaveBeenCalledWith("2100", "so-gls-heavy")
    expect(searchFoxpostPickupPoints).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(await screen.findByTestId("csomagpont"))
    })
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-gls-heavy",
      data: { gls_pickup_point: { id: "SHOP1" } },
    })
  })

  it("a kosárban álló GLS-pontot megmutatja", () => {
    rajzol(
      kosar([
        {
          id: "sm-1",
          shipping_option_id: "so-gls",
          data: { gls_pickup_point: { id: "SHOP1", name: "Bolt", address: "2100 Gödöllő, Fő tér 1." } },
        },
      ]),
    )
    expect(screen.getByTestId("csomagpont-kivalasztott").textContent).toBe(
      "Kiválasztott csomagpont: Bolt, 2100 Gödöllő, Fő tér 1.",
    )
  })

  it("a Foxpost ugyanabban a lépésben a Foxpost keresőjét használja", async () => {
    searchFoxpostPickupPoints.mockResolvedValue({ elerheto: true, pontok: [], talalat: 0 })
    rajzol()
    fireEvent.click(radio(3))
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), { target: { value: "Gödöllő" } })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(searchFoxpostPickupPoints).toHaveBeenCalledWith("Gödöllő")
    expect(searchGlsPickupPoints).not.toHaveBeenCalled()
  })
})
