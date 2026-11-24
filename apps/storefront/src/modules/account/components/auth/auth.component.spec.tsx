import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// A szerver-muveletek itt nem futnak; a viselkedesuket a
// `customer-regisztracio.spec.ts` meri.
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

vi.mock("@lib/data/customer", () => ({
  login: vi.fn(),
  signup: vi.fn(),
}))

import { ADATKEZELES_CIM, ASZF_CIM } from "@lib/util/aszf"
import LoginTemplate from "@modules/account/templates/login-template"

afterEach(() => cleanup())

/**
 * A BELEPES ES A REGISZTRACIO (256:3, 256:36). MI PIROSIT: ha a cim, a
 * felulcim vagy a mezok nem a keret szerint allnak; ha a regisztracio pipaja
 * nem kotelezo, vagy nem az ASZF es az adatkezelesi tajekoztato cimere visz;
 * ha a keret nem epitett sora ("Emlékezz rám") megis megjelenik, egy nem
 * mukodo igerettel, vagy az "Elfelejtett jelszó" link nem az uj lapra visz.
 */
describe("a belépés és a regisztráció", () => {
  it("a belépés: felülcím, cím, két mező és a gomb", () => {
    render(<LoginTemplate />)
    const lap = screen.getByTestId("login-page")
    expect(within(lap).getByText("Fiók")).toBeTruthy()
    expect(within(lap).getByRole("heading").textContent).toBe("Bejelentkezés")
    expect(within(lap).getByLabelText("E-mail").getAttribute("type")).toBe(
      "email",
    )
    expect(within(lap).getByLabelText("Jelszó").getAttribute("type")).toBe(
      "password",
    )
    expect(screen.getByTestId("sign-in-button").textContent).toBe(
      "Bejelentkezés",
    )
  })

  it("a belépésen van elfelejtett jelszó link (a bolt a levelet küldi, kártya 7bfca4eb) az új lapra, de nincs emlékező pipa", () => {
    render(<LoginTemplate />)
    const link = screen.getByTestId("forgot-password-link")
    expect(link.textContent).toBe("Elfelejtett jelszó?")
    expect(link.getAttribute("href")).toBe("/hu/elfelejtett-jelszo")
    expect(screen.queryByText(/Emlékezz rám/)).toBeNull()
  })

  it("a Regisztráció gomb a regisztrációra vált, és vissza", () => {
    render(<LoginTemplate />)
    fireEvent.click(screen.getByTestId("register-button"))
    expect(screen.getByTestId("register-page")).toBeTruthy()
    fireEvent.click(screen.getByTestId("sign-in-link"))
    expect(screen.getByTestId("login-page")).toBeTruthy()
  })

  it("a regisztráció: öt kötelező mező és a kötelező ÁSZF-pipa", () => {
    render(<LoginTemplate />)
    fireEvent.click(screen.getByTestId("register-button"))
    const lap = screen.getByTestId("register-page")
    for (const cimke of [
      "Vezetéknév",
      "Keresztnév",
      "E-mail",
      "Jelszó",
      "Jelszó újra",
    ]) {
      expect(within(lap).getByLabelText(cimke).hasAttribute("required")).toBe(
        true,
      )
    }
    const pipa = screen.getByTestId("aszf-checkbox") as HTMLInputElement
    expect(pipa.name).toBe("aszf")
    expect(pipa.required).toBe(true)
    expect(screen.getByTestId("register-button").textContent).toBe(
      "Fiók létrehozása",
    )
  })

  it("a pipa mondata az ÁSZF-re és az adatkezelési tájékoztatóra visz", () => {
    render(<LoginTemplate />)
    fireEvent.click(screen.getByTestId("register-button"))
    expect(
      screen.getByRole("link", { name: "ÁSZF-et" }).getAttribute("href"),
    ).toBe(ASZF_CIM)
    expect(
      screen
        .getByRole("link", { name: "adatkezelési tájékoztatót" })
        .getAttribute("href"),
    ).toBe(ADATKEZELES_CIM)
  })
})
