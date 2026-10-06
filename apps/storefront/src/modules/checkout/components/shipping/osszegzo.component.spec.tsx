import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// a szallitasi lepes LEZARVA: a vevo mar a fizetesnel tart
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
}))
vi.mock("@lib/data/cart", () => ({ setShippingMethod: vi.fn() }))
vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))
vi.mock("@lib/data/csomagpont", () => ({
  searchFoxpostPickupPoints: vi.fn(),
  searchGlsPickupPoints: vi.fn(),
}))

import Shipping from "./index"

afterEach(cleanup)

const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 1150,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  }) as unknown as HttpTypes.StoreCartShippingOption

const kosar = (modok: unknown[]) =>
  ({
    id: "cart-1",
    email: "proba@example.test",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: modok,
    currency_code: "huf",
  }) as unknown as HttpTypes.StoreCart

/**
 * A LEZART SZALLITASI LEPES OSSZEGZOJE (Foxpost-prompt 4. pont: a valasztott
 * pont a lepes lezarasa utan is latszik). MI PIROSIT: ha csak a mod neve es
 * ara allna ott, a pont neve nelkul; ha hazhoz szallitasnal kitalalt pont
 * jelenne meg.
 */
describe("a szállítási lépés összegzője", () => {
  it("a kiválasztott FOXPOST pont neve a lezárt lépésben is látszik", () => {
    render(
      <Shipping
        cart={kosar([
          {
            id: "sm-1",
            shipping_option_id: "so-fox",
            name: "Foxpost",
            amount: 1150,
            data: {
              foxpost_pickup_point: {
                id: "hu53",
                name: "FOXPOST A-BOX Gödöllő",
              },
            },
          },
        ])}
        availableShippingMethods={[mod("so-fox", "Foxpost")]}
        foxpostOptionId="so-fox"
      />,
    )
    expect(screen.getByTestId("delivery-summary-point").textContent).toBe(
      "FOXPOST A-BOX Gödöllő",
    )
  })

  it("házhoz szállításnál nincs pont-sor", () => {
    render(
      <Shipping
        cart={kosar([
          {
            id: "sm-1",
            shipping_option_id: "so-home",
            name: "GLS házhoz",
            amount: 1150,
            data: {},
          },
        ])}
        availableShippingMethods={[
          mod("so-home", "GLS házhoz"),
          mod("so-fox", "Foxpost"),
        ]}
        foxpostOptionId="so-fox"
      />,
    )
    expect(screen.queryByTestId("delivery-summary-point")).toBeNull()
  })
})
