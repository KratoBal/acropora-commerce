import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const muveletek = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  saveProfile: vi.fn(),
}))
vi.mock("@lib/data/customer", () => muveletek)

import LoginTemplate from "@modules/account/templates/login-template"

import ProfilUrlap from "../profil-urlap"

afterEach(() => cleanup())

const ertek = (elem: HTMLElement) => (elem as HTMLInputElement).value
const ir = (elem: HTMLElement, szoveg: string) =>
  fireEvent.change(elem, { target: { value: szoveg } })
const bekuld = async (urlap: HTMLElement) => {
  await act(async () => {
    fireEvent.submit(urlap)
  })
}

/**
 * HIBAS BEKULDES UTAN A MEZOK NEM URULNEK KI (#411, #412). A React 19 az action
 * utan alaphelyzetbe allitja az urlapot; a mezok a hibaallapot `ertekek`
 * mezojebol toltodnek vissza. Itt a VALODI React bekuldes fut (a muvelet
 * hibat ad), nem egy kezzel beallitott allapot. MI PIROSIT: ha a regisztracio
 * vagy a profil a hibanal kiurul vagy a mentett ertekre ugrik vissza; ha a
 * jelszo visszatoltodik; ha a belepes elfelejti az e-mailt.
 */
describe("hibás beküldés után a mezők megmaradnak", () => {
  it("a regisztráció a beírt adatokkal és a pipával marad, a jelszavak nélkül", async () => {
    muveletek.signup.mockResolvedValue({
      state: "error",
      error: "A két jelszó nem egyezik.",
      ertekek: {
        last_name: "Minta",
        first_name: "Anna",
        email: "vevo@example.hu",
        aszf: "on",
      },
    })
    render(<LoginTemplate />)
    fireEvent.click(screen.getByTestId("register-button"))
    const lap = screen.getByTestId("register-page")
    ir(within(lap).getByLabelText("Vezetéknév"), "Minta")
    ir(within(lap).getByLabelText("Keresztnév"), "Anna")
    ir(within(lap).getByLabelText("E-mail"), "vevo@example.hu")
    ir(within(lap).getByLabelText("Jelszó"), "titok123")
    ir(within(lap).getByLabelText("Jelszó újra"), "masik")
    fireEvent.click(screen.getByTestId("aszf-checkbox"))

    await bekuld(lap.querySelector("form")!)

    expect(muveletek.signup).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("register-error").textContent).toContain(
      "A két jelszó nem egyezik.",
    )
    expect(ertek(within(lap).getByLabelText("Vezetéknév"))).toBe("Minta")
    expect(ertek(within(lap).getByLabelText("Keresztnév"))).toBe("Anna")
    expect(ertek(within(lap).getByLabelText("E-mail"))).toBe("vevo@example.hu")
    expect(
      (screen.getByTestId("aszf-checkbox") as HTMLInputElement).checked,
    ).toBe(true)
    expect(ertek(within(lap).getByLabelText("Jelszó"))).toBe("")
    expect(ertek(within(lap).getByLabelText("Jelszó újra"))).toBe("")
  })

  it("a belépés megtartja az e-mailt, a jelszót nem", async () => {
    muveletek.login.mockResolvedValue({
      state: "error",
      error: "Hibás e-mail-cím vagy jelszó.",
      ertekek: { email: "vevo@example.hu" },
    })
    render(<LoginTemplate />)
    const lap = screen.getByTestId("login-page")
    ir(within(lap).getByLabelText("E-mail"), "vevo@example.hu")
    ir(within(lap).getByLabelText("Jelszó"), "rossz")

    await bekuld(lap.querySelector("form")!)

    expect(muveletek.login).toHaveBeenCalledTimes(1)
    expect(ertek(within(lap).getByLabelText("E-mail"))).toBe("vevo@example.hu")
    expect(ertek(within(lap).getByLabelText("Jelszó"))).toBe("")
  })

  it("a profil a beírt értékkel marad, nem ugrik vissza a mentettre", async () => {
    muveletek.saveProfile.mockResolvedValue({
      state: "error",
      error: "A vezetéknév és a keresztnév kötelező.",
      ertekek: { first_name: "", last_name: "Újnév", phone: "+36 30 999 8888" },
    })
    render(
      <ProfilUrlap
        customer={
          {
            id: "cus_1",
            first_name: "Anna",
            last_name: "Minta",
            email: "vevo@example.hu",
            phone: "+36 20 123 4567",
          } as never
        }
      />,
    )
    ir(screen.getByLabelText("Vezetéknév"), "Újnév")
    ir(screen.getByLabelText("Keresztnév"), "")
    ir(screen.getByLabelText("Telefonszám"), "+36 30 999 8888")

    await bekuld(screen.getByTestId("profile-page-wrapper"))

    expect(muveletek.saveProfile).toHaveBeenCalledTimes(1)
    expect(ertek(screen.getByLabelText("Vezetéknév"))).toBe("Újnév")
    expect(ertek(screen.getByLabelText("Keresztnév"))).toBe("")
    expect(ertek(screen.getByLabelText("Telefonszám"))).toBe("+36 30 999 8888")
  })
})
