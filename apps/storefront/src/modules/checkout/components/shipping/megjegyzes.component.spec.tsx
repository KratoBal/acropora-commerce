import { HttpTypes } from "@medusajs/types"
import { act, cleanup, render, screen } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
const mentsMegjegyzeseket = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("step=delivery"),
}))
vi.mock("@lib/data/cart", () => ({
  setShippingMethod: vi.fn(async () => ({ ok: true })),
  mentsMegjegyzeseket: (...args: unknown[]) => mentsMegjegyzeseket(...args),
}))
vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))
vi.mock("@lib/data/csomagpont", () => ({
  searchFoxpostPickupPoints: vi.fn(),
  searchGlsPickupPoints: vi.fn(),
}))

import { MEGJEGYZES_MENTES_HIBA } from "@lib/util/penztar-uzenet"

import Shipping from "./index"

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  mentsMegjegyzeseket.mockReset()
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

const kosar = (optionId: string, metadata: Record<string, unknown> = {}) =>
  ({
    id: "cart-1",
    email: "proba@example.test",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: [
      {
        id: "sm-1",
        shipping_option_id: optionId,
        name: "mód",
        amount: 1990,
        data:
          optionId === "so-fox" ? { foxpost_pickup_point: { id: "P1" } } : {},
      },
    ],
    currency_code: "huf",
    metadata,
  }) as unknown as HttpTypes.StoreCart

const rajzol = (k: HttpTypes.StoreCart) =>
  render(
    <Shipping
      cart={k}
      availableShippingMethods={[
        mod("so-home", "GLS házhozszállítás"),
        mod("so-fox", "Foxpost csomagpont"),
      ]}
      foxpostOptionId="so-fox"
    />,
  )

const tovabb = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("submit-delivery-option-button"))
  })
}

/**
 * A VEVO KET MEGJEGYZESE A SZALLITASI LEPESBEN (kartya d3b54954). MI PIROSIT:
 * ha a futar-mezo csomagpontnal is latszana; ha valtozatlan megjegyzesnel is
 * hivas menne; ha a mentes hibaja utan a vevo csendben tovabblepne (a
 * megjegyzese elveszne); ha csomagpontra valtva a tarolt futar-uzenet a
 * rendelesen maradna; ha a mezok nem a hatter hosszkorlatat hordanak.
 */
describe("a rendelés megjegyzései", () => {
  it("házhoz szállításnál mindkét mező látszik, a háttér korlátjával", () => {
    rajzol(kosar("so-home"))
    expect(
      screen.getByTestId("megjegyzes-vevo").getAttribute("maxLength"),
    ).toBe("1000")
    expect(
      screen.getByTestId("megjegyzes-futar").getAttribute("maxLength"),
    ).toBe("50")
  })

  it("csomagpontnál a futárnak szóló mező nincs ott", () => {
    rajzol(kosar("so-fox"))
    expect(screen.getByTestId("megjegyzes-vevo")).toBeTruthy()
    expect(screen.queryByTestId("megjegyzes-futar")).toBeNull()
  })

  it("a kitöltött mezők a továbblépéskor mentődnek, és utána megy a fizetésre", async () => {
    mentsMegjegyzeseket.mockResolvedValue({ ok: true })
    rajzol(kosar("so-home"))
    fireEvent.change(screen.getByTestId("megjegyzes-vevo"), {
      target: { value: "Délután legyen" },
    })
    fireEvent.change(screen.getByTestId("megjegyzes-futar"), {
      target: { value: "Kapukód 12" },
    })
    await tovabb()
    expect(mentsMegjegyzeseket).toHaveBeenCalledWith("cart-1", {
      customer_note: "Délután legyen",
      carrier_note: "Kapukód 12",
    })
    expect(push).toHaveBeenCalledWith("/hu/checkout?step=payment", {
      scroll: false,
    })
  })

  it("változatlan megjegyzésnél nincs hívás", async () => {
    rajzol(kosar("so-home", { acropora_customer_note: "Délután" }))
    await tovabb()
    expect(mentsMegjegyzeseket).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalled()
  })

  it("csomagpontnál a tárolt futár-üzenet törlődik", async () => {
    mentsMegjegyzeseket.mockResolvedValue({ ok: true })
    rajzol(kosar("so-fox", { acropora_carrier_note: "Kapukód 12" }))
    await tovabb()
    expect(mentsMegjegyzeseket).toHaveBeenCalledWith("cart-1", {
      carrier_note: null,
    })
  })

  it("ha a mentés nem sikerül, a vevő a hibát látja és a lépésen marad", async () => {
    mentsMegjegyzeseket.mockResolvedValue({
      ok: false,
      uzenet: MEGJEGYZES_MENTES_HIBA,
    })
    rajzol(kosar("so-home"))
    fireEvent.change(screen.getByTestId("megjegyzes-vevo"), {
      target: { value: "x" },
    })
    await tovabb()
    expect(push).not.toHaveBeenCalled()
    expect(
      screen.getByTestId("delivery-option-error-message").textContent,
    ).toContain(MEGJEGYZES_MENTES_HIBA)
  })
})
