import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const muveletek = vi.hoisted(() => ({
  addCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(async () => undefined),
}))
vi.mock("@lib/data/customer", () => muveletek)

import AddressBook from "../address-book"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const MENTETT = {
  id: "addr_1",
  address_name: "Otthon",
  first_name: "Anna",
  last_name: "Minta",
  address_1: "Minta utca 12.",
  postal_code: "1111",
  city: "Budapest",
  country_code: "hu",
  is_default_shipping: true,
}
const REGIO = {
  id: "reg_hu",
  countries: [{ iso_2: "hu", display_name: "Magyarország" }],
} as never
const ertek = (testId: string) =>
  (screen.getByTestId(testId) as HTMLInputElement).value
const pipa = () =>
  (screen.getByTestId("address-default-checkbox") as HTMLInputElement).checked
const ir = (testId: string, szoveg: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value: szoveg } })
const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("address-name-input").closest("form")!)
  })
}

/**
 * HIBAS MENTES UTAN A CIM-ABLAK MEZOI MEGMARADNAK (a #418 mintajara). Itt a
 * VALODI React bekuldes fut, a muvelet hibat ad. MI PIROSIT: ha a szerkeszto
 * ablak a mentett cimre ugrik vissza, vagy a pipa visszaall; ha a felvevo ablak
 * kiurul.
 */
describe("hibás mentés után a cím-ablak mezői megmaradnak", () => {
  it("a szerkesztő ablak a beírt értékkel marad, nem a mentettel", async () => {
    muveletek.updateCustomerAddress.mockResolvedValue({
      success: false,
      error: "Nem sikerült, próbáld újra.",
      ertekek: {
        address_name: "Munkahely",
        first_name: "Anna",
        last_name: "Minta",
        company: "",
        address_1: "Minta utca 12.",
        address_2: "",
        postal_code: "1111",
        city: "Szeged",
        province: "",
        country_code: "hu",
        phone: "",
        is_default_shipping: "",
      },
    })
    render(
      <AddressBook
        customer={{ id: "cus_1", addresses: [MENTETT] } as never}
        region={REGIO}
      />,
    )
    fireEvent.click(screen.getByTestId("address-edit-button"))
    ir("address-name-input", "Munkahely")
    ir("city-input", "Szeged")
    fireEvent.click(screen.getByTestId("address-default-checkbox"))

    await bekuld()

    expect(muveletek.updateCustomerAddress).toHaveBeenCalledTimes(1)
    expect(ertek("address-name-input")).toBe("Munkahely")
    expect(ertek("city-input")).toBe("Szeged")
    expect(pipa()).toBe(false)
  })

  it("a felvevő ablak nem ürül ki", async () => {
    muveletek.addCustomerAddress.mockResolvedValue({
      success: false,
      error: "Nem sikerült, próbáld újra.",
      ertekek: {
        address_name: "Nyaraló",
        first_name: "Béla",
        last_name: "Kovács",
        company: "",
        address_1: "Tó utca 3.",
        address_2: "",
        postal_code: "8600",
        city: "Siófok",
        province: "",
        country_code: "hu",
        phone: "",
        is_default_shipping: "",
      },
    })
    render(
      <AddressBook
        customer={{ id: "cus_1", addresses: [MENTETT] } as never}
        region={REGIO}
      />,
    )
    fireEvent.click(screen.getByTestId("add-address-button"))
    ir("address-name-input", "Nyaraló")
    ir("first-name-input", "Béla")
    ir("last-name-input", "Kovács")
    ir("address-1-input", "Tó utca 3.")
    ir("postal-code-input", "8600")
    ir("city-input", "Siófok")

    await bekuld()

    expect(muveletek.addCustomerAddress).toHaveBeenCalledTimes(1)
    expect(ertek("address-name-input")).toBe("Nyaraló")
    expect(ertek("first-name-input")).toBe("Béla")
    expect(ertek("city-input")).toBe("Siófok")
    expect(ertek("postal-code-input")).toBe("8600")
  })
})
