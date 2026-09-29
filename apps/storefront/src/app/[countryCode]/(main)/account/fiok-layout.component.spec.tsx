import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/account",
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
    expect(screen.queryByTestId("belepo-slot")).toBeNull()
  })
})
