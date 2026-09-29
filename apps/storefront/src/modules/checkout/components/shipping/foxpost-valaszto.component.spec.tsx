import { HttpTypes } from "@medusajs/types"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setShippingMethod = vi.fn()
const searchFoxpostPickupPoints = vi.fn()

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
  searchFoxpostPickupPoints: (...args: unknown[]) =>
    searchFoxpostPickupPoints(...args),
}))

import Shipping from "./index"

afterEach(cleanup)
beforeEach(() => {
  setShippingMethod.mockReset()
  searchFoxpostPickupPoints.mockReset()
})

const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 1150,
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
        mod("so-gls", "GLS"),
        mod("so-fox", "Foxpost"),
      ]}
      foxpostOptionId="so-fox"
    />,
  )

const PONT = {
  id: "HU1",
  name: "FOXPOST A-BOX Gödöllő",
  address: "2100 Gödöllő, Fő tér 1.",
  zip: "2100",
  city: "Gödöllő",
}

/**
 * A FOXPOST-CSOMAGPONT VÁLASZTÓ (P4). MI PIROSIT: ha a Foxpost kiválasztása
 * pont nélkül beállítja a módot (a háttér elutasítaná); ha a választott pont
 * nem jut el a mód adatába; ha a "Tovább" a pont kiválasztása előtt is mehet;
 * ha a kosárban álló pont nem látszik.
 */
describe("a Foxpost-csomagpont választó a szállítási lépésben", () => {
  it("a Foxpost kiválasztása a választót nyitja, és még nem állít módot", () => {
    rajzol()
    expect(screen.queryByTestId("csomagpont-valaszto")).toBeNull()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    expect(screen.getByTestId("csomagpont-valaszto")).toBeTruthy()
    expect(setShippingMethod).not.toHaveBeenCalled()
  })

  it("a keresés a beírt szöveggel megy, és a választott pont a mód adatába kerül", async () => {
    searchFoxpostPickupPoints.mockResolvedValue({
      elerheto: true,
      pontok: [PONT],
      talalat: 1,
    })
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "Gödöllő" },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(searchFoxpostPickupPoints).toHaveBeenCalledWith("Gödöllő")

    await act(async () => {
      fireEvent.click(await screen.findByTestId("csomagpont"))
    })
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-fox",
      data: { foxpost_pickup_point: { id: "HU1" } },
    })
  })

  it("a Tovább gomb a pont kiválasztásáig nem mehet, akkor sem, ha más mód áll a kosárban", () => {
    rajzol(kosar([{ id: "sm-1", shipping_option_id: "so-gls", data: {} }]))
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    expect(
      (screen.getByTestId("submit-delivery-option-button") as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it("a kosárban álló pontot megmutatja, és a Tovább mehet", () => {
    rajzol(
      kosar([
        {
          id: "sm-1",
          shipping_option_id: "so-fox",
          data: {
            foxpost_pickup_point: {
              id: "HU1",
              name: PONT.name,
              address: PONT.address,
            },
          },
        },
      ]),
    )
    expect(screen.getByTestId("csomagpont-kivalasztott").textContent).toBe(
      `Kiválasztott csomagpont: ${PONT.name}, ${PONT.address}`,
    )
    expect(
      (screen.getByTestId("submit-delivery-option-button") as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })

  it("nem elérhető Foxpostnál és találat nélkül kimondja", async () => {
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "x" },
    })
    searchFoxpostPickupPoints.mockResolvedValueOnce({
      elerheto: false,
      pontok: [],
      talalat: 0,
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(screen.getByTestId("csomagpont-nem-elerheto")).toBeTruthy()

    searchFoxpostPickupPoints.mockResolvedValueOnce({
      elerheto: true,
      pontok: [],
      talalat: 0,
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("csomagpont-nincs")).toBeTruthy(),
    )
  })
})
