import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
}))

const muveletek = vi.hoisted(() => ({
  addCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(async () => undefined),
}))
vi.mock("@lib/data/customer", () => muveletek)

import AddressBook from "."

beforeEach(() => {
  nav.countryCode = "hu"
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const REGIO = {
  id: "reg_hu",
  countries: [{ iso_2: "hu", display_name: "Magyarország" }],
} as never
const cim = (extra: Record<string, unknown> = {}) => ({
  id: "addr_1",
  address_1: "Minta utca 12.",
  postal_code: "1111",
  city: "Budapest",
  country_code: "hu",
  ...extra,
})
const lista = (addresses: unknown[], locale?: "hu" | "en") =>
  render(
    <AddressBook
      customer={{ id: "cus_1", addresses } as never}
      region={REGIO}
      locale={locale}
    />,
  )
const bekuld = async (urlap: HTMLElement) => {
  await act(async () => {
    fireEvent.submit(urlap)
  })
}

/**
 * A CIMEK A LAP NYELVEN. MI PIROSIT: ha az angol uton magyar felirat marad
 * (a lista fejlece, a gombok, az ablakok mezoi); ha a cim akcioinak hibakodja
 * nem a lap nyelven jelenik meg; ha a magyar ut szovege elmozdul.
 */
describe("a címek a lap nyelvén", () => {
  it("angolul a lista fejléce, az üres lista és a gomb angol", () => {
    nav.countryCode = "en-hu"
    lista([], "en")
    expect(screen.getByText("Saved delivery addresses")).toBeTruthy()
    expect(screen.getByTestId("add-address-button").textContent).toBe(
      "New address",
    )
    expect(screen.getByTestId("address-empty").textContent).toBe(
      "You have no saved address yet.",
    )
  })

  it("angolul a kártya jelölője, a gombjai és a név nélküli cím tartaléka angol", () => {
    nav.countryCode = "en-hu"
    lista([cim({ is_default_shipping: true })], "en")
    const kartya = screen.getByTestId("address-container")
    expect(within(kartya).getByTestId("address-name").textContent).toBe(
      "Address",
    )
    expect(within(kartya).getByTestId("address-default").textContent).toBe(
      "Default",
    )
    expect(within(kartya).getByTestId("address-edit-button").textContent).toBe(
      "Edit",
    )
    expect(
      within(kartya).getByTestId("address-delete-button").textContent,
    ).toBe("Delete")
  })

  it("magyarul a régi feliratok", () => {
    lista([cim({ is_default_shipping: true })])
    expect(screen.getByText("Mentett szállítási címek")).toBeTruthy()
    const kartya = screen.getByTestId("address-container")
    expect(within(kartya).getByTestId("address-name").textContent).toBe("Cím")
    expect(within(kartya).getByTestId("address-default").textContent).toBe(
      "Alapértelmezett",
    )
    expect(within(kartya).getByTestId("address-edit-button").textContent).toBe(
      "Szerkesztés",
    )
    expect(
      within(kartya).getByTestId("address-delete-button").textContent,
    ).toBe("Törlés")
  })

  it("angolul a felvevő ablak mezői, gombjai és hibamondata angol", async () => {
    nav.countryCode = "en-hu"
    muveletek.addCustomerAddress.mockResolvedValue({
      success: false,
      error: "generic",
      ertekek: {},
    })
    lista([], "en")
    fireEvent.click(screen.getByTestId("add-address-button"))
    expect(screen.getByText("Add an address")).toBeTruthy()
    for (const felirat of [
      "Name of the address (e.g. Home)",
      "Default delivery address",
      "First name",
      "Last name",
      "Company name",
      "Address",
      "Floor, door, etc.",
      "Postal code",
      "City",
      "County / state",
      "Phone number",
    ])
      // the required fields carry a star after the label
      expect(
        screen.getByLabelText(
          new RegExp(`^${felirat.replace(/[().]/g, "\\$&")}[*]?$`),
        ),
      ).toBeTruthy()
    expect(screen.getByLabelText("Country")).toBeTruthy()
    expect(screen.getByTestId("cancel-button").textContent).toBe("Cancel")
    expect(screen.getByTestId("save-button").textContent).toBe("Save")
    await bekuld(screen.getByTestId("first-name-input").closest("form")!)
    expect(screen.getByTestId("address-error").textContent).toBe(
      "That did not work, try again. If it happens again, write to us.",
    )
  })

  it("angolul a szerkesztő ablak címe és a hiányzó azonosító hibája angol", async () => {
    nav.countryCode = "en-hu"
    muveletek.updateCustomerAddress.mockResolvedValue({
      success: false,
      error: "address_id_required",
      ertekek: {},
    })
    lista([cim()], "en")
    fireEvent.click(screen.getByTestId("address-edit-button"))
    expect(screen.getByText("Edit the address")).toBeTruthy()
    await bekuld(screen.getByTestId("first-name-input").closest("form")!)
    expect(screen.getByText("The address ID is missing.")).toBeTruthy()
  })

  it("magyarul a régi hibamondat és az ablak címe", async () => {
    muveletek.addCustomerAddress.mockResolvedValue({
      success: false,
      error: "generic",
      ertekek: {},
    })
    lista([])
    fireEvent.click(screen.getByTestId("add-address-button"))
    expect(screen.getByText("Cím hozzáadása")).toBeTruthy()
    await bekuld(screen.getByTestId("first-name-input").closest("form")!)
    expect(screen.getByTestId("address-error").textContent).toBe(
      "Nem sikerült, próbáld újra. Ha újra előjön, írj nekünk.",
    )
  })
})
