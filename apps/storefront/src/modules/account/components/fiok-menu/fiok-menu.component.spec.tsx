import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ utvonal: "/hu/account/profile" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => nav.utvonal,
}))
const vevo = vi.hoisted(() => ({ signout: vi.fn() }))
vi.mock("@lib/data/customer", () => vevo)

import FiokMenu, { FiokFej } from "."

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // Az utvonal a teszt vegen MINDIG visszaall, akkor is, ha egy allitas
  // elbukott: kulonben atszivarog a kovetkezo tesztbe (a P5-2 kalibracio F1
  // rontasa igy adott egy hamis, masodlagos pirosat).
  nav.utvonal = "/hu/account/profile"
})

/**
 * A FIOK MENUJE ES FEJE (257:17, 257:21, 257:219). MI PIROSIT: ha az aktiv
 * pont nincs jelolve, vagy mas pont is aktiv; ha a kijelentkezes nem hiv
 * kilepest; ha a fej cime nem az utvonalbol jon.
 */
describe("a fiók menüje", () => {
  it("asztalon a három pont, az aktív jelölve", () => {
    render(<FiokMenu />)
    const asztali = screen.getByTestId("account-nav")
    const linkek = within(asztali).getAllByRole("link")
    expect(linkek.map((a) => a.textContent)).toEqual([
      "Profil",
      "Rendeléseim",
      "Címek",
    ])
    expect(linkek.map((a) => a.getAttribute("aria-current"))).toEqual([
      "page",
      null,
      null,
    ])
    expect(linkek[1].getAttribute("href")).toBe("/hu/account/orders")
  })

  it("mobilon fülsor ugyanazokkal a pontokkal", () => {
    nav.utvonal = "/hu/account/addresses"
    render(<FiokMenu />)
    const fulek = within(screen.getByTestId("mobile-account-nav")).getAllByRole(
      "link",
    )
    expect(fulek.map((a) => a.textContent)).toEqual([
      "Profil",
      "Rendeléseim",
      "Címek",
    ])
    expect(fulek[2].getAttribute("aria-current")).toBe("page")
  })

  it("a kijelentkezés kilépést hív, az országkóddal", () => {
    render(<FiokMenu />)
    fireEvent.click(screen.getByTestId("logout-button"))
    expect(vevo.signout).toHaveBeenCalledWith("hu")
  })

  it("a fej címe az útvonalból jön", () => {
    render(<FiokFej />)
    expect(screen.getByTestId("fiok-cim").textContent).toBe("Profil")
    expect(screen.getByText("Fiókom")).toBeTruthy()
  })
})
