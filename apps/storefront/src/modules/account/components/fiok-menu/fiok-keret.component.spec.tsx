import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ utvonal: "/hu/account/orders" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => nav.utvonal,
}))
vi.mock("@lib/data/customer", () => ({ signout: vi.fn() }))

import { FiokKeret } from "."

afterEach(() => {
  cleanup()
  nav.utvonal = "/hu/account/orders"
})

/**
 * A FIOK KERETE UTVONAL SZERINT (249:96). MI PIROSIT: ha a rendeles
 * reszleteinel megjelenik a menu vagy a kozos fej; ha a tobbi lapon eltunik.
 */
describe("a fiók kerete útvonal szerint", () => {
  it("a rendeléseken fej és menü", () => {
    render(
      <FiokKeret>
        <p>tartalom</p>
      </FiokKeret>,
    )
    expect(screen.getByTestId("fiok-cim")).toBeTruthy()
    expect(screen.getByTestId("account-nav")).toBeTruthy()
    expect(screen.getByText("tartalom")).toBeTruthy()
  })

  it("a rendelés részleteinél se menü, se közös fej", () => {
    nav.utvonal = "/hu/account/orders/details/order_1"
    render(
      <FiokKeret>
        <p>tartalom</p>
      </FiokKeret>,
    )
    expect(screen.getByTestId("fiok-reszletek-keret")).toBeTruthy()
    expect(screen.queryByTestId("fiok-cim")).toBeNull()
    expect(screen.queryByTestId("account-nav")).toBeNull()
    expect(screen.getByText("tartalom")).toBeTruthy()
  })
})
