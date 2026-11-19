import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

/**
 * A CEGES VASARLAS A CIM LEPESEN (kartya c977aed2). MI PIROSIT: ha a pipa nem `company_purchase` nevu (a szerver-muvelet onnan
 * olvas); ha a pipa nelkul adoszam-mezo latszik, vagy pipaval nem kotelezo / nem a `tax_id` nevu; ha ceges vasarlasnal a cegnev
 * nem kotelezo; ha a kosaron mar levo adoszam nem tolti elo a mezot es nem jelol be a pipat; ha az osszefoglalo nem mutatja az
 * adoszamot.
 */
describe("céges vásárlás a cím lépésen", () => {
  it("a pipa nélkül nincs adószám-mező, és a cégnév nem kötelező", () => {
    render(<Addresses cart={kosar} customer={null} />)
    const pipa = screen.getByTestId("ceges-vasarlas-pipa") as HTMLInputElement
    expect(pipa.getAttribute("name")).toBe("company_purchase")
    expect(pipa.checked).toBe(false)
    expect(screen.queryByTestId("adoszam-mezo")).toBeNull()
    expect(screen.getByTestId("shipping-company-input")).not.toBeRequired()
  })

  it("a pipával kötelező adószám-mező jelenik meg, és a cégnév is kötelező", () => {
    render(<Addresses cart={kosar} customer={null} />)
    fireEvent.click(screen.getByTestId("ceges-vasarlas-pipa"))
    const mezo = screen.getByTestId("adoszam-mezo") as HTMLInputElement
    expect(mezo.getAttribute("name")).toBe("tax_id")
    expect(mezo).toBeRequired()
    expect(mezo.getAttribute("pattern")).toBe(
      "\\d{8}[\\s\\-]*[1-5][\\s\\-]*\\d{2}",
    )
    expect(mezo.getAttribute("title")).toMatch(/magyar adószámot/)
    expect(screen.getByTestId("shipping-company-input")).toBeRequired()
  })

  it("a bejegyzett cég adószáma megy az űrlapon a pipával együtt", () => {
    const { container } = render(<Addresses cart={kosar} customer={null} />)
    fireEvent.click(screen.getByTestId("ceges-vasarlas-pipa"))
    fireEvent.change(screen.getByTestId("adoszam-mezo"), {
      target: { value: "12345678-2-41" },
    })
    const adat = new FormData(
      container.querySelector("form") as HTMLFormElement,
    )
    expect(adat.get("company_purchase")).toBe("on")
    expect(adat.get("tax_id")).toBe("12345678-2-41")
  })

  it("külön számlázási címnél a számlázási cégnév kötelező, a szállítási nem", () => {
    const { container } = render(<Addresses cart={kosar} customer={null} />)
    fireEvent.click(screen.getByTestId("ceges-vasarlas-pipa"))
    fireEvent.click(screen.getByTestId("billing-address-checkbox"))
    expect(screen.getByTestId("billing-company-input")).toBeRequired()
    expect(screen.getByTestId("shipping-company-input")).not.toBeRequired()
    expect(container.querySelector('[name="tax_id"]')).not.toBeNull()
  })

  it("a kosáron már meglévő adószám bejelöli a pipát és kitölti a mezőt", () => {
    const adoszamosKosar = {
      ...(kosar as object),
      billing_address: {
        ...(kosar as { shipping_address: object }).shipping_address,
        company: "Minta Kft.",
        metadata: { tax_id: "12345678-2-41" },
      },
    } as never
    render(<Addresses cart={adoszamosKosar} customer={null} />)
    expect(
      (screen.getByTestId("ceges-vasarlas-pipa") as HTMLInputElement).checked,
    ).toBe(true)
    expect((screen.getByTestId("adoszam-mezo") as HTMLInputElement).value).toBe(
      "12345678-2-41",
    )
  })

  it("a fiók alapértelmezett számlázási címének adószáma előtölti a mezőt", () => {
    const fiok = {
      addresses: [
        {
          id: "a1",
          is_default_billing: true,
          metadata: { tax_id: "87654321-2-41" },
          country_code: "hu",
        },
      ],
    } as never
    render(<Addresses cart={kosar} customer={fiok} />)
    expect(
      (screen.getByTestId("ceges-vasarlas-pipa") as HTMLInputElement).checked,
    ).toBe(true)
    expect((screen.getByTestId("adoszam-mezo") as HTMLInputElement).value).toBe(
      "87654321-2-41",
    )
  })

  it("angolul angol címkék, ugyanazok a nevek", () => {
    orszagKod = "en-hu"
    render(<Addresses cart={kosar} customer={null} />)
    expect(screen.getByText(/Company purchase/)).toBeTruthy()
    fireEvent.click(screen.getByTestId("ceges-vasarlas-pipa"))
    expect(screen.getByLabelText(/Tax number/).getAttribute("name")).toBe(
      "tax_id",
    )
    expect(screen.queryByText("Adószám")).toBeNull()
  })

  it("zárt állapotban az összefoglaló mutatja a cégnevet és az adószámot", () => {
    lepes = "delivery"
    const adoszamosKosar = {
      ...(kosar as object),
      billing_address: {
        ...(kosar as { shipping_address: object }).shipping_address,
        company: "Minta Kft.",
        metadata: { tax_id: "12345678-2-41" },
      },
    } as never
    render(<Addresses cart={adoszamosKosar} customer={null} />)
    expect(screen.getByTestId("szamlazasi-cegnev").textContent).toBe(
      "Minta Kft.",
    )
    expect(screen.getByTestId("szamlazasi-adoszam").textContent).toBe(
      "Adószám: 12345678-2-41",
    )
  })

  it("magánszemélynél az összefoglalóban nincs cégnév és adószám sor", () => {
    lepes = "delivery"
    render(<Addresses cart={kosar} customer={null} />)
    expect(screen.queryByTestId("szamlazasi-adoszam")).toBeNull()
    expect(screen.queryByTestId("szamlazasi-cegnev")).toBeNull()
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
