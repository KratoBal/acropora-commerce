import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let lepes = "address"
let orszagKod = "hu"

vi.mock("@lib/data/cart", () => ({ setAddresses: vi.fn() }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(`step=${lepes}`),
}))

import Addresses from "./index"

afterEach(cleanup)
beforeEach(() => {
  lepes = "address"
  orszagKod = "hu"
})

/**
 * A CÍM LÉPÉS, KÉT NYELVEN. Mit mér: az űrlap `name`-jei és a `same_as_billing`
 * pipa értéke (a `setAddresses` ezekből olvas, tehát a kirajzolás átírása sem
 * változtathatja őket), a címkék a szótárból jönnek és a mezőhöz kötöttek, az
 * összefoglaló zárt állapotban a kosár adatait mutatja.
 */
const kosar = {
  id: "cart-1",
  email: "minta@example.com",
  region: {
    id: "reg",
    countries: [{ iso_2: "hu", display_name: "Magyarország" }],
  },
  shipping_address: {
    first_name: "Minta",
    last_name: "Vevő",
    address_1: "Minta utca 12.",
    address_2: "",
    postal_code: "1111",
    city: "Budapest",
    country_code: "hu",
    phone: "+36 30 000 0000",
    company: "",
    province: "",
  },
  billing_address: null,
} as never

describe("a cím lépés nyitva", () => {
  it("magyarul a címke a mezőt nevezi meg, a név és az autocomplete a régi", () => {
    render(<Addresses cart={kosar} customer={null} />)
    const mezo = screen.getByLabelText(/Keresztnév/)
    expect(mezo.getAttribute("name")).toBe("shipping_address.first_name")
    expect(mezo.getAttribute("autocomplete")).toBe("given-name")
    expect(mezo).toBeRequired()
    expect(screen.getByLabelText(/Ország/).getAttribute("name")).toBe(
      "shipping_address.country_code",
    )
    expect(screen.getByTestId("submit-address-button").textContent).toBe(
      "Tovább a szállításhoz",
    )
  })

  it("angolul ugyanazok a nevek, angol címkékkel", () => {
    orszagKod = "en-hu"
    render(<Addresses cart={kosar} customer={null} />)
    const mezo = screen.getByLabelText(/First name/)
    expect(mezo.getAttribute("name")).toBe("shipping_address.first_name")
    expect(screen.getByTestId("submit-address-button").textContent).toBe(
      "Continue to shipping",
    )
    expect(screen.queryByText("Keresztnév")).toBeNull()
  })

  it("a nevek sorrendje a nyelvé: magyarul előbb a vezetéknév, angolul az utónév", () => {
    const { container, unmount } = render(
      <Addresses cart={kosar} customer={null} />,
    )
    const nevek = () =>
      Array.from(container.querySelectorAll("input"))
        .map((i) => i.getAttribute("name"))
        .filter((n) => n?.endsWith("_name"))
    expect(nevek()).toEqual([
      "shipping_address.last_name",
      "shipping_address.first_name",
    ])
    unmount()
    orszagKod = "en-hu"
    const angol = render(<Addresses cart={kosar} customer={null} />)
    expect(
      Array.from(angol.container.querySelectorAll("input"))
        .map((i) => i.getAttribute("name"))
        .filter((n) => n?.endsWith("_name")),
    ).toEqual(["shipping_address.first_name", "shipping_address.last_name"])
  })

  it("a számlázási pipa `on` értéket küld, amit a setAddresses vár", () => {
    const { container } = render(<Addresses cart={kosar} customer={null} />)
    const urlap = container.querySelector("form") as HTMLFormElement
    expect(new FormData(urlap).get("same_as_billing")).toBe("on")
    // a pipa az egyetlen név szerinti jelölő: a számlázási mezők nincsenek az űrlapon
    expect(container.querySelector('[name^="billing_address"]')).toBeNull()
  })
})

describe("a cím lépés zárva", () => {
  it("angolul az utónév áll elől, és az ország angol nevén", () => {
    lepes = "delivery"
    orszagKod = "en-hu"
    render(<Addresses cart={kosar} customer={null} />)
    const cim = screen.getByTestId("shipping-address-summary").textContent ?? ""
    expect(cim).toContain("Minta Vevő")
    expect(cim).toContain("Hungary")
  })

  it("az összefoglaló a kosár adatait mutatja, szerkesztés gombbal", () => {
    lepes = "delivery"
    render(<Addresses cart={kosar} customer={null} />)
    const cim = screen.getByTestId("shipping-address-summary").textContent ?? ""
    // magyar névsorrend, vessző nélküli város-sor, az ország neve a kód helyett
    expect(cim).toContain("Vevő Minta")
    expect(cim).toContain("Minta utca 12.")
    expect(cim).toContain("1111 Budapest")
    expect(cim).not.toContain("1111,")
    expect(cim).toContain("Magyarország")
    expect(cim).not.toContain("HU")
    expect(
      screen.getByTestId("shipping-contact-summary").textContent,
    ).toContain("minta@example.com")
    expect(screen.getByTestId("billing-address-summary").textContent).toContain(
      "megegyezik",
    )
    expect(screen.getByTestId("edit-address-button").textContent).toBe(
      "Szerkesztés",
    )
  })
})
