import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
}))

const muveletek = vi.hoisted(() => ({
  saveProfile: vi.fn(),
  changePassword: vi.fn(),
  saveBilling: vi.fn(),
}))
vi.mock("@lib/data/customer", () => muveletek)

import JelszoUrlap from "./jelszo-urlap"
import ProfilUrlap from "./profil-urlap"
import SzamlazasiUrlap from "./szamlazasi-urlap"

beforeEach(() => {
  nav.countryCode = "hu"
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const VEVO = {
  id: "cus_1",
  first_name: "Anna",
  last_name: "Minta",
  email: "vevo@example.hu",
  phone: "+36 20 123 4567",
} as never

const bekuld = async (urlap: HTMLElement) => {
  await act(async () => {
    fireEvent.submit(urlap)
  })
}

/**
 * A PROFIL, A JELSZO ES A SZAMLAZAS A LAP NYELVEN. MI PIROSIT: ha az angol uton
 * magyar felirat marad; ha a szerver-muvelet hibakodja nem a lap nyelven
 * jelenik meg; ha a magyar ut szovege elmozdul.
 */
describe("a profil a lap nyelvén", () => {
  it("angolul angol feliratok, siker- és hibaüzenet", async () => {
    nav.countryCode = "en-hu"
    muveletek.saveProfile.mockResolvedValue({
      state: "error",
      error: "names_required",
      ertekek: { first_name: "", last_name: "Minta", phone: "" },
    })
    render(<ProfilUrlap customer={VEVO} />)
    expect(screen.getByLabelText("Last name")).toBeTruthy()
    expect(screen.getByLabelText("First name")).toBeTruthy()
    expect(screen.getByLabelText("Phone number")).toBeTruthy()
    expect(
      screen.getByText("The e-mail address cannot be changed here."),
    ).toBeTruthy()
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Save",
    ])
    await bekuld(screen.getByTestId("profile-page-wrapper"))
    expect(screen.getByTestId("profile-error").textContent).toBe(
      "The last name and the first name are required.",
    )
  })

  it("magyarul a régi hibamondat", async () => {
    muveletek.saveProfile.mockResolvedValue({
      state: "error",
      error: "names_required",
      ertekek: { first_name: "", last_name: "Minta", phone: "" },
    })
    render(<ProfilUrlap customer={VEVO} />)
    await bekuld(screen.getByTestId("profile-page-wrapper"))
    expect(screen.getByTestId("profile-error").textContent).toBe(
      "A vezetéknév és a keresztnév kötelező.",
    )
  })
})

describe("a jelszó módosítása a lap nyelvén", () => {
  it("angolul angol feliratok és hibamondat", async () => {
    nav.countryCode = "en-hu"
    muveletek.changePassword.mockResolvedValue({
      state: "error",
      error: "current_password_wrong",
    })
    render(<JelszoUrlap />)
    expect(screen.getByRole("heading").textContent).toBe("Change your password")
    expect(screen.getByLabelText("Current password")).toBeTruthy()
    expect(screen.getByLabelText("New password")).toBeTruthy()
    expect(screen.getByLabelText("New password again")).toBeTruthy()
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Save password",
    ])
    await bekuld(screen.getByTestId("jelszo-urlap"))
    expect(screen.getByTestId("jelszo-hiba").textContent).toBe(
      "The current password is not correct.",
    )
  })

  it("angolul a sikerüzenet is angol", async () => {
    nav.countryCode = "en-hu"
    muveletek.changePassword.mockResolvedValue({ state: "success" })
    render(<JelszoUrlap />)
    await bekuld(screen.getByTestId("jelszo-urlap"))
    expect(screen.getByTestId("jelszo-siker").textContent).toBe(
      "Your password has changed.",
    )
  })
})

describe("a számlázási űrlap a lap nyelvén", () => {
  it("angolul angol feliratok, a Cég előhozza a cég mezőit, és a hibamondat is angol", async () => {
    nav.countryCode = "en-hu"
    muveletek.saveBilling.mockResolvedValue({
      state: "error",
      error: "tax_id_format",
      ertekek: {
        tipus: "ceg",
        ceg: "Minta Kft.",
        adoszam: "123",
        iranyitoszam: "1111",
        varos: "Budapest",
        utca: "Minta utca 12.",
      },
    })
    render(<SzamlazasiUrlap cim={null} />)
    expect(screen.getByLabelText("Private person")).toBeTruthy()
    expect(screen.getByLabelText("Postal code")).toBeTruthy()
    expect(screen.getByLabelText("City")).toBeTruthy()
    expect(screen.getByLabelText("Street, house number")).toBeTruthy()
    fireEvent.click(screen.getByTestId("tipus-ceg"))
    expect(screen.getByLabelText("Company name")).toBeTruthy()
    expect(screen.getByLabelText("Tax number")).toBeTruthy()
    await bekuld(screen.getByTestId("szamlazas-urlap"))
    expect(screen.getByTestId("szamlazas-hiba").textContent).toBe(
      "Enter the tax number in the form 12345678-1-23.",
    )
  })

  it("magyarul a régi adószám-hibamondat", async () => {
    muveletek.saveBilling.mockResolvedValue({
      state: "error",
      error: "tax_id_format",
      ertekek: {
        tipus: "maganszemely",
        ceg: "",
        adoszam: "",
        iranyitoszam: "1111",
        varos: "Budapest",
        utca: "Minta utca 12.",
      },
    })
    render(<SzamlazasiUrlap cim={null} />)
    await bekuld(screen.getByTestId("szamlazas-urlap"))
    expect(screen.getByTestId("szamlazas-hiba").textContent).toBe(
      "Az adószámot 12345678-1-23 alakban add meg.",
    )
  })
})
