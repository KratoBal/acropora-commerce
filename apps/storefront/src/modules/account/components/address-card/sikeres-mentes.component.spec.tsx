import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { szerverFa } from "@lib/teszt/szerver-fa"

const muveletek = vi.hoisted(() => ({
  addCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(async () => undefined),
}))
vi.mock("@lib/data/customer", () => muveletek)

// the real Modal leaves with a Headless UI transition that jsdom never finishes;
// what is measured here is the `isOpen` the component hands it, so a stand-in
// that renders its children exactly while it is open
vi.mock("@modules/common/components/modal", () => {
  const Modal = ({
    isOpen,
    children,
    "data-testid": testId,
  }: {
    isOpen: boolean
    children: React.ReactNode
    "data-testid"?: string
  }) => (isOpen ? <div data-testid={testId}>{children}</div> : null)
  const Reszek = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Modal.Title = Reszek
  Modal.Description = Reszek
  Modal.Body = Reszek
  Modal.Footer = Reszek
  return { default: Modal }
})

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
const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("address-name-input").closest("form")!)
  })
}
const felulet = async () =>
  render(
    await szerverFa(
      <AddressBook
        customer={{ id: "cus_1", addresses: [MENTETT] } as never}
        region={REGIO}
      />,
    ),
  )

// a NEW state object per save, like the real action returns (mockResolvedValue would hand back one object, and the same object is no change to React)
/**
 * SIKERES MENTES UTAN A CIM-ABLAK BEZAROD, ES A KOVETKEZO SIKERES MENTES UTAN
 * IS (a storefront-lint-0-20261123 atalakitas vedoje: az ablak a `formState`
 * valtozasara zar, nem egy kozbenso allapoton at). MI PIROSIT: ha a sikeres
 * mentes utan az ablak nyitva marad; ha csak az elso mentes zar, a masodik nem.
 */
describe("sikeres mentés után a cím-ablak bezárul", () => {
  it("a felvevő ablak bezárul, és újranyitva a második mentés után is", async () => {
    muveletek.addCustomerAddress.mockImplementation(async () => ({
      success: true,
      error: null,
    }))
    await felulet()
    for (const kor of [1, 2]) {
      fireEvent.click(screen.getByTestId("add-address-button"))
      expect(screen.queryByTestId("add-address-modal")).not.toBeNull()
      await bekuld()
      expect(muveletek.addCustomerAddress).toHaveBeenCalledTimes(kor)
      expect(screen.queryByTestId("add-address-modal")).toBeNull()
    }
  })

  it("a szerkesztő ablak bezárul, és újranyitva a második mentés után is", async () => {
    muveletek.updateCustomerAddress.mockImplementation(async () => ({
      success: true,
      error: null,
    }))
    await felulet()
    for (const kor of [1, 2]) {
      fireEvent.click(screen.getByTestId("address-edit-button"))
      expect(screen.queryByTestId("edit-address-modal")).not.toBeNull()
      await bekuld()
      expect(muveletek.updateCustomerAddress).toHaveBeenCalledTimes(kor)
      expect(screen.queryByTestId("edit-address-modal")).toBeNull()
    }
  })
})
