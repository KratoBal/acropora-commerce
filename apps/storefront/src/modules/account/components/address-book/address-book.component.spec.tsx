import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/customer", () => ({
  addCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(async () => undefined),
}))

import AddressBook from "."

afterEach(() => cleanup())

const cim = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  first_name: "Anna",
  last_name: "Minta",
  address_1: "Minta utca 12.",
  postal_code: "1111",
  city: "Budapest",
  country_code: "hu",
  ...extra,
})
const REGIO = {
  id: "reg_hu",
  countries: [{ iso_2: "hu", display_name: "Magyarország" }],
} as never
const lista = (addresses: unknown[]) =>
  render(
    <AddressBook
      customer={{ id: "cus_1", addresses } as never}
      region={REGIO}
    />,
  )

/**
 * A MENTETT CIMEK LISTAJA (257:82). MI PIROSIT: ha a kartya cime nem a cim
 * neve; ha az alapertelmezett jelolo rossz kartyan all vagy nem elol; ha nincs
 * "Új cím"; ha ures listanal ures lap all mondat helyett; ha a szerkeszto
 * ablakbol hianyzik a ket uj mezo.
 */
describe("a mentett címek listája", () => {
  it("a kártyák: név, egy címsor, az alapértelmezett elöl és jelölve", () => {
    lista([
      cim("a", { address_name: "Munkahely" }),
      cim("b", { address_name: "Otthon", is_default_shipping: true }),
    ])
    const kartyak = screen.getAllByTestId("address-container")
    expect(
      kartyak.map((k) => within(k).getByTestId("address-name").textContent),
    ).toEqual(["Otthon", "Munkahely"])
    expect(within(kartyak[0]).getByTestId("address-default").textContent).toBe(
      "Alapértelmezett",
    )
    expect(within(kartyak[1]).queryByTestId("address-default")).toBeNull()
    expect(within(kartyak[0]).getByTestId("address-address").textContent).toBe(
      "1111 Budapest, Minta utca 12.",
    )
  })

  it("fej és Új cím gomb; üres listánál mondat", () => {
    lista([])
    expect(screen.getByText("Mentett szállítási címek")).toBeTruthy()
    expect(screen.getByTestId("add-address-button").textContent).toBe("Új cím")
    expect(screen.getByTestId("address-empty").textContent).toBe(
      "Még nincs mentett címed.",
    )
  })

  it("a szerkesztő ablakban ott a név és az alapértelmezés mezője", () => {
    lista([cim("a", { address_name: "Otthon", is_default_shipping: true })])
    fireEvent.click(screen.getByTestId("address-edit-button"))
    const nev = screen.getByTestId("address-name-input") as HTMLInputElement
    expect(nev.value).toBe("Otthon")
    expect(
      (screen.getByTestId("address-default-checkbox") as HTMLInputElement)
        .checked,
    ).toBe(true)
  })
})
