import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let orszagKod = "hu"
const setShippingMethod = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
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
  searchFoxpostPickupPoints: vi.fn(),
  searchGlsPickupPoints: vi.fn(),
}))

import Shipping from "./index"

afterEach(cleanup)
beforeEach(() => {
  orszagKod = "hu"
  setShippingMethod.mockReset()
})

/**
 * A SZÁLLÍTÁSI LÉPÉS KÉT NYELVEN. Mit mér: a lépés minden szövege a lap
 * nyelvén áll (cím, kérdés, a GLS sorok neve és leírása, a tovább gomb, a
 * megjegyzés mezők), a szerver-művelet hibájának KULCSÁT a lap nyelvén írja ki
 * (a magyar mondat csak tartalék), és a Foxpost sora a márkanevet nem fordítja.
 */
const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 3500,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  }) as unknown as HttpTypes.StoreCartShippingOption

const kosar = {
  id: "cart-1",
  email: "proba@example.com",
  shipping_address: { id: "a", country_code: "hu" },
  billing_address: { id: "b", country_code: "hu" },
  shipping_methods: [],
  currency_code: "huf",
} as unknown as HttpTypes.StoreCart

const rajzol = () =>
  render(
    <Shipping
      cart={kosar}
      availableShippingMethods={[
        mod("so-gls", "GLS csomagpont"),
        mod("so-haz", "GLS házhozszállítás"),
        mod("so-fox", "Foxpost"),
      ]}
      glsOptions={[{ option_id: "so-gls", heavy: false }]}
      glsHomeOptions={[{ option_id: "so-haz", heavy: false }]}
      foxpostOptionId="so-fox"
    />,
  )

describe("a szállítási lépés nyelve", () => {
  it("magyarul a régi szavak állnak", () => {
    rajzol()
    expect(screen.getByText("Szállítási mód")).toBeTruthy()
    expect(screen.getAllByTestId("szallitasi-sor-nev")[0].textContent).toBe(
      "GLS csomagpont",
    )
    expect(
      screen.getByTestId("submit-delivery-option-button").textContent,
    ).toBe("Tovább a fizetéshez")
    expect(screen.getByText("Megjegyzés a rendeléshez")).toBeTruthy()
  })

  it("angolul minden szöveg angol, a FOXPOST márkanév marad", () => {
    orszagKod = "en-hu"
    rajzol()
    expect(screen.getByText("Shipping method")).toBeTruthy()
    expect(
      screen.getAllByTestId("szallitasi-sor-nev").map((e) => e.textContent),
    ).toEqual(["GLS pickup point", "GLS home delivery"])
    expect(screen.getByTestId("foxpost-mod-nev").textContent).toBe("FOXPOST")
    expect(screen.getAllByTestId("szallitasi-sor-leiras")[0].textContent).toBe(
      "GLS ParcelShop or locker · 1–2 working days",
    )
    expect(
      screen.getByTestId("submit-delivery-option-button").textContent,
    ).toBe("Continue to payment")
    expect(screen.getByText("Note for the order")).toBeTruthy()
    expect(screen.queryByText("Szállítási mód")).toBeNull()
  })

  it("a szerver hibájának kulcsát a lap nyelvén írja ki", async () => {
    orszagKod = "en-hu"
    setShippingMethod.mockResolvedValue({
      ok: false,
      uzenet: "Ezt a szállítási módot nem tudtuk beállítani. Válassz másikat.",
      kod: "checkoutShipping.errorRejected",
    })
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    await waitFor(() =>
      expect(
        screen.getByTestId("delivery-option-error-message").textContent,
      ).toContain("We could not set this shipping method."),
    )
  })

  it("kulcs nélküli hibánál a magyar mondat a tartalék", async () => {
    setShippingMethod.mockResolvedValue({ ok: false, uzenet: "Régi mondat." })
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    await waitFor(() =>
      expect(
        screen.getByTestId("delivery-option-error-message").textContent,
      ).toContain("Régi mondat."),
    )
  })
})

/**
 * AZ ÁR SZÖVEGE ÉS A TILTOTT FOXPOST KÁRTYÁJA (acrobot, 2026-11-02, az előnézetről).
 *
 * - a nulla összeg "Ingyenes" / "Free", nem "0 Ft" és nem kötőjel (egy kötőjel
 *   árnak nem olvasható); a nem nulla összeg pénzként marad;
 * - ha a Foxpost egy tétel miatt nem jár, a kártyája ott áll halványan, nem
 *   választhatóan, és az ok a SAJÁT kártyájában olvasható; a háttér listáján
 *   álló Foxpost-mód ilyenkor nem jelenik meg másodszor.
 */
const bolt = {
  id: "so-bolt",
  name: "Átvétel a boltban",
  price_type: "flat",
  amount: 0,
  insufficient_inventory: false,
  service_zone: {
    fulfillment_set: {
      type: "pickup",
      location: {
        address: {
          address_1: "Pesti Gábor utca 35",
          postal_code: "1106",
          city: "Budapest",
          country_code: "hu",
        },
      },
    },
  },
} as unknown as HttpTypes.StoreCartShippingOption

describe("az ár szövege", () => {
  it("a nulla összeg Ingyenes, magyarul és angolul, a többi pénz marad", () => {
    const { unmount } = render(
      <Shipping
        cart={kosar}
        availableShippingMethods={[bolt, mod("so-haz", "Futár")]}
      />,
    )
    const sorok = screen.getAllByTestId("delivery-option-radio")
    expect(sorok[0].textContent).toContain("Ingyenes")
    expect(sorok[0].textContent).not.toContain("0 Ft")
    // a formázó tagoló szóköze nem szóköz: a szóközök nélküli szövegben keresünk
    expect((sorok[1].textContent ?? "").replace(/\s/g, "")).toContain("3500Ft")
    unmount()
    orszagKod = "en-hu"
    render(
      <Shipping
        cart={kosar}
        availableShippingMethods={[bolt, mod("so-haz", "Futár")]}
      />,
    )
    expect(
      screen.getAllByTestId("delivery-option-radio")[0].textContent,
    ).toContain("Free")
  })
})

describe("a tiltott FOXPOST kártyája", () => {
  const rajzolTiltva = () =>
    render(
      <Shipping
        cart={kosar}
        availableShippingMethods={[
          mod("so-haz", "Futár"),
          mod("so-fox", "Foxpost"),
        ]}
        foxpostOptionId="so-fox"
        foxpostTiltottTetel="Reef Salt 25 kg"
      />,
    )

  it("halványan, nem választhatóan áll, az ok a saját kártyájában", () => {
    rajzolTiltva()
    const kartya = screen.getByTestId("foxpost-kartya-tiltva")
    expect(kartya.getAttribute("aria-disabled")).toBe("true")
    expect(kartya.className).toContain("opacity-60")
    expect(kartya.textContent).toContain("FOXPOST")
    expect(
      screen
        .getByTestId("foxpost-tiltva")
        .closest('[data-testid="foxpost-kartya-tiltva"]'),
    ).toBe(kartya)
    expect(kartya.textContent).toContain(
      "Ez a tétel nem küldhető automatába: Reef Salt 25 kg.",
    )
  })

  it("a háttér listáján álló Foxpost-mód nem jelenik meg másodszor, és nem kattintható", () => {
    rajzolTiltva()
    // csak a Futár mód választható sor; a Foxpost-mód a lista szűrése miatt nincs
    expect(screen.getAllByTestId("delivery-option-radio")).toHaveLength(1)
    expect(screen.queryByTestId("foxpost-mod-nev")).toBeNull()
  })

  it("tiltás nélkül a Foxpost-mód a szokott módon választható sor", () => {
    render(
      <Shipping
        cart={kosar}
        availableShippingMethods={[
          mod("so-haz", "Futár"),
          mod("so-fox", "Foxpost"),
        ]}
        foxpostOptionId="so-fox"
      />,
    )
    expect(screen.getAllByTestId("delivery-option-radio")).toHaveLength(2)
    expect(screen.queryByTestId("foxpost-kartya-tiltva")).toBeNull()
  })
})
