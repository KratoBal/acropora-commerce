import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu", pathname: "/hu/account" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}))
const vevo = vi.hoisted(() => ({
  retrieveCustomer: vi.fn(),
  signout: vi.fn(),
}))
vi.mock("@lib/data/customer", () => vevo)

import AccountPageLayout from "./layout"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
  nav.pathname = "/hu/account"
})

const lap = async () =>
  render(
    await AccountPageLayout({
      login: <div data-testid="belepo-slot" />,
      dashboard: <div data-testid="fiok-slot" />,
    }),
  )

/**
 * A FIOK UTVONALANAK KERETE (P5, 256:3). MI PIROSIT: ha bejelentkezes nelkul
 * a belepo lap a fiok keretebe (oldalmenu, "Kérdésed van?" sav) kerul; ha a
 * bejelentkezett vevo keret nelkul kapja a fiokot.
 */
describe("a fiók útvonalának kerete", () => {
  it("bejelentkezés nélkül a belépő lap áll, a fiók kerete nélkül", async () => {
    vevo.retrieveCustomer.mockRejectedValue(new Error("401"))
    await lap()
    expect(screen.getByTestId("belepo-slot")).toBeTruthy()
    expect(screen.queryByTestId("account-page")).toBeNull()
    expect(screen.queryByTestId("fiok-slot")).toBeNull()
  })

  it("bejelentkezve a fiók a keretben áll", async () => {
    vevo.retrieveCustomer.mockResolvedValue({
      id: "cus_1",
      first_name: "Anna",
      last_name: "Minta",
      email: "vevo@example.hu",
    })
    await lap()
    expect(screen.getByTestId("account-page")).toBeTruthy()
    expect(screen.getByTestId("fiok-slot")).toBeTruthy()
    // A menu is a keret resze (a P5-2 kalibraciojabol: a menut kiveve minden
    // allitas zold maradt).
    expect(screen.getByTestId("account-nav")).toBeTruthy()
    expect(screen.getByTestId("fiok-cim").textContent).toBe("Áttekintés")
    expect(screen.queryByTestId("belepo-slot")).toBeNull()
  })
})

describe("a fiók kerete a lap nyelvén", () => {
  const bejelentkezve = () =>
    vevo.retrieveCustomer.mockResolvedValue({
      id: "cus_1",
      first_name: "Anna",
      last_name: "Minta",
      email: "vevo@example.hu",
    })

  it("angolul a fej, a menü és a kijelentkezés angol, a linkek az angol úton", async () => {
    nav.countryCode = "en-hu"
    nav.pathname = "/en-hu/account/orders"
    bejelentkezve()
    await lap()
    expect(screen.getByTestId("fiok-cim").textContent).toBe("My orders")
    expect(screen.getByTestId("fiok-leiras").textContent).toBe(
      "Your current and past orders in one place.",
    )
    expect(screen.getByText("My account")).toBeTruthy()
    const menu = screen.getByTestId("account-nav")
    expect(menu.textContent).toContain("Billing details")
    expect(screen.getByTestId("logout-button").textContent).toBe("Sign out")
    expect(screen.getByTestId("orders-link").getAttribute("href")).toBe(
      "/en-hu/account/orders",
    )
    expect(screen.getByRole("navigation", { name: "Account" })).toBeTruthy()
    expect(screen.getByTestId("mobile-account-nav").textContent).toContain(
      "Billing",
    )
  })

  it("magyarul a régi feliratok", async () => {
    nav.pathname = "/hu/account/orders"
    bejelentkezve()
    await lap()
    expect(screen.getByTestId("fiok-cim").textContent).toBe("Rendeléseim")
    expect(screen.getByTestId("logout-button").textContent).toBe(
      "Kijelentkezés",
    )
    expect(screen.getByRole("navigation", { name: "Fiók" })).toBeTruthy()
  })
})
