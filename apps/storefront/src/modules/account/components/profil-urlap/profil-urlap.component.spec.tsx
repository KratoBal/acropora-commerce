import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/customer", () => ({ saveProfile: vi.fn() }))

import ProfilUrlap from "."

afterEach(() => cleanup())

const VEVO = {
  id: "cus_1",
  first_name: "Anna",
  last_name: "Minta",
  email: "vevo@example.hu",
  phone: "+36 20 123 4567",
} as never

/**
 * A PROFIL URLAPJA (257:35). MI PIROSIT: ha a mezok nem a vevo adataival
 * nyilnak; ha az e-mail szerkesztheto (a bolti API nem menti); ha a nev
 * nem kotelezo; ha nincs egyetlen "Mentés" gomb.
 */
describe("a profil űrlapja", () => {
  it("a vevő adataival nyílik", () => {
    render(<ProfilUrlap customer={VEVO} />)
    expect(
      (screen.getByLabelText("Vezetéknév") as HTMLInputElement).value,
    ).toBe("Minta")
    expect(
      (screen.getByLabelText("Keresztnév") as HTMLInputElement).value,
    ).toBe("Anna")
    expect(
      (screen.getByLabelText("Telefonszám") as HTMLInputElement).value,
    ).toBe("+36 20 123 4567")
  })

  it("az e-mail csak olvasható, és ezt ki is mondja", () => {
    render(<ProfilUrlap customer={VEVO} />)
    const email = screen.getByLabelText("E-mail") as HTMLInputElement
    expect(email.readOnly).toBe(true)
    expect(screen.getByText("Az e-mail-cím itt nem módosítható.")).toBeTruthy()
  })

  it("a név kötelező, és egy Mentés gomb van", () => {
    render(<ProfilUrlap customer={VEVO} />)
    expect(screen.getByLabelText("Vezetéknév").hasAttribute("required")).toBe(
      true,
    )
    expect(screen.getByLabelText("Keresztnév").hasAttribute("required")).toBe(
      true,
    )
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Mentés",
    ])
  })
})
