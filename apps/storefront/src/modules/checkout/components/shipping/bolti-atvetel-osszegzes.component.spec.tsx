import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
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
 * A LEZART SZALLITASI LEPES OSSZEGZESE EGY ATVETELI HELYNEL (task t-20261116-penztar-attekinto-uzlet): ugyanazt mondja, mint az
 * üzlet-kártya (#792): az üzlet neve es cime all, nem az opcio neve. MI PIROSIT: egy atveteli helynel az opcio neve all a MOD sorban;
 * a cim hianyzik; tobb atveteli helynel az uzlet neve all (az opcio neve mondja meg, melyik); hazhoz szallitasnal cim jelenik meg;
 * a kosarban nem az atvetel all, mégis az atvetel cime latszik.
 */
function atvetel(id: string, name = "Bolti átvétel") {
  return {
    id,
    name,
    price_type: "flat",
    amount: 0,
    insufficient_inventory: false,
    service_zone: {
      fulfillment_set: {
        type: "pickup",
        location: {
          id: `sloc_${id}`,
          address: {
            address_1: "Minta utca 1",
            postal_code: "1111",
            city: "Budapest",
            country_code: "hu",
          },
        },
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

function kosar(optionId: string, name: string, amount = 0) {
  return {
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: [{ shipping_option_id: optionId, name, amount }],
    currency_code: "huf",
  } as unknown as HttpTypes.StoreCart
}

describe("a lezárt szállítási lépés összegzése átvételnél", () => {
  it("egy átvételi helynél az üzlet neve és címe áll, az opció neve nem", () => {
    render(
      <Shipping
        cart={kosar("so-bolt", "Bolti átvétel")}
        availableShippingMethods={[haz(), atvetel("so-bolt")]}
        boltiHiany={null}
      />,
    )
    const mod = screen.getByTestId("delivery-summary-mode").textContent ?? ""
    expect(mod).toContain("Acropora üzlet")
    expect(mod).not.toContain("Bolti átvétel")
    const cim = screen.getByTestId("delivery-summary-address").textContent
    expect(cim).toContain("Minta utca 1")
    expect(cim).toContain("1111")
  })

  it("több átvételi helynél az opció neve marad, és cím nem jelenik meg", () => {
    render(
      <Shipping
        cart={kosar("so-bolt", "Bolti átvétel")}
        availableShippingMethods={[
          haz(),
          atvetel("so-bolt"),
          atvetel("so-raktar", "Acropora raktár"),
        ]}
        boltiHiany={null}
      />,
    )
    const mod = screen.getByTestId("delivery-summary-mode").textContent ?? ""
    expect(mod).toContain("Bolti átvétel")
    expect(mod).not.toContain("Acropora üzlet")
    expect(screen.queryByTestId("delivery-summary-address")).toBeNull()
  })

  it("házhoz szállításnál az opció neve áll, és az üzlet címe nem jelenik meg", () => {
    render(
      <Shipping
        cart={kosar("so-haz", "Futár", 1990)}
        availableShippingMethods={[haz(), atvetel("so-bolt")]}
        boltiHiany={null}
      />,
    )
    const mod = screen.getByTestId("delivery-summary-mode").textContent ?? ""
    expect(mod).toContain("Futár")
    expect(mod).not.toContain("Acropora üzlet")
    expect(screen.queryByTestId("delivery-summary-address")).toBeNull()
  })
})
