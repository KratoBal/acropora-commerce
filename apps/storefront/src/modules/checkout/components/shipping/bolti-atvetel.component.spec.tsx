import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=delivery"),
}))

vi.mock("@lib/data/cart", () => ({
  setShippingMethod: vi.fn(),
}))

vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))

import Shipping from "./index"

afterEach(cleanup)

/**
 * A LETILTOTT BOLTI ATVETEL MAGYARAZATA A SZALLITAS LEPESEN (V2.5 B, kartya ffa5d8c6).
 *
 * MI PIROSIT: ha a letiltott atvetel mellett nem all mondat; ha a mondat nem a kapott tetelneveket
 * mondja; ha nev nelkul ures mondat all; ha egy elerheto atvetel mellett is megjelenik; ha a mod
 * kartyaja letiltott atvetelnel tovabbra is valaszthato maradna.
 */
function atvetel(id: string, hianyzik: boolean) {
  return {
    id,
    name: "Bolti átvétel",
    price_type: "flat",
    amount: 0,
    insufficient_inventory: hianyzik,
    service_zone: {
      fulfillment_set: {
        type: "pickup",
        location: { id: "sloc_1", address: { address_1: "Minta utca 1" } },
      },
    },
  } as unknown as HttpTypes.StoreCartShippingOption
}

function haz() {
  return {
    id: "so-haz",
    name: "Futár",
    price_type: "flat",
    amount: 1990,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  } as unknown as HttpTypes.StoreCartShippingOption
}

function kosar(valasztott?: string): HttpTypes.StoreCart {
  return {
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: valasztott ? [{ shipping_option_id: valasztott }] : [],
    currency_code: "huf",
  } as unknown as HttpTypes.StoreCart
}

describe("a letiltott bolti atvetel mondata", () => {
  it("BAK-MOD: ha minden atvetel letiltott, a mod kartyaja tiltott, es alatta a tetel neve all", () => {
    render(
      <Shipping
        cart={kosar()}
        availableShippingMethods={[haz(), atvetel("so-bolt", true)]}
        boltiHiany={["Acropora austea"]}
      />,
    )
    const mondat = screen.getByTestId("bolti-atvetel-tiltva")
    expect(mondat.textContent).toContain("Acropora austea")
    const kartyak = screen.getAllByTestId("delivery-option-radio")
    expect(kartyak[0].hasAttribute("data-disabled")).toBe(true)
  })

  it("BAK-ALTALANOS: nev nelkul az altalanos mondat all, ures szoveg nem", () => {
    render(
      <Shipping
        cart={kosar()}
        availableShippingMethods={[haz(), atvetel("so-bolt", true)]}
        boltiHiany={null}
      />,
    )
    const szoveg = screen.getByTestId("bolti-atvetel-tiltva").textContent ?? ""
    expect(szoveg).toContain("egyik tétele")
  })

  it("BAK-LISTA: a letiltott opcio sora (ha mar nyitva a lista) a sajat mondatat viseli", () => {
    render(
      <Shipping
        cart={kosar("so-bolt")}
        availableShippingMethods={[haz(), atvetel("so-bolt", true)]}
        boltiHiany={["Acropora austea"]}
      />,
    )
    expect(
      screen.getByTestId("bolti-atvetel-lista-tiltva").textContent,
    ).toContain("Acropora austea")
  })

  it("BAK-ELERHETO: elerheto atvetel mellett nincs mondat, es a mod kartyaja valaszthato", () => {
    render(
      <Shipping
        cart={kosar()}
        availableShippingMethods={[haz(), atvetel("so-bolt", false)]}
        boltiHiany={["Acropora austea"]}
      />,
    )
    expect(screen.queryByTestId("bolti-atvetel-tiltva")).toBeNull()
    expect(screen.queryByTestId("bolti-atvetel-lista-tiltva")).toBeNull()
    const kartyak = screen.getAllByTestId("delivery-option-radio")
    expect(kartyak[0].hasAttribute("data-disabled")).toBe(false)
  })
})
