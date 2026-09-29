import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/customer", () => ({ saveBilling: vi.fn() }))

import SzamlazasiUrlap from "."

afterEach(() => cleanup())

/**
 * A SZAMLAZASI URLAP (257:134). MI PIROSIT: ha maganszemelynel is ker cegnevet
 * es adoszamot; ha a Cég valasztasa nem hozza elo oket; ha egy ceges cim nem
 * Cég valasztassal es kitoltott adoszammal nyilik.
 */
describe("a számlázási űrlap", () => {
  it("cím nélkül magánszemélyként nyílik, cég és adószám nélkül; a Cég előhozza őket", () => {
    render(<SzamlazasiUrlap cim={null} />)
    expect(
      (screen.getByTestId("tipus-maganszemely") as HTMLInputElement).checked,
    ).toBe(true)
    expect(screen.queryByLabelText("Cégnév")).toBeNull()
    expect(screen.queryByLabelText("Adószám")).toBeNull()

    fireEvent.click(screen.getByTestId("tipus-ceg"))
    expect(screen.getByLabelText("Cégnév").hasAttribute("required")).toBe(true)
    expect(screen.getByLabelText("Adószám").hasAttribute("required")).toBe(true)
  })

  it("céges címnél Cég választással és a mentett adatokkal nyílik", () => {
    render(
      <SzamlazasiUrlap
        cim={
          {
            id: "addr_1",
            company: "Minta Kft.",
            postal_code: "1111",
            city: "Budapest",
            address_1: "Minta utca 12.",
            metadata: { tax_id: "12345676-2-13" },
          } as never
        }
      />,
    )
    expect((screen.getByTestId("tipus-ceg") as HTMLInputElement).checked).toBe(
      true,
    )
    expect((screen.getByLabelText("Cégnév") as HTMLInputElement).value).toBe(
      "Minta Kft.",
    )
    expect((screen.getByLabelText("Adószám") as HTMLInputElement).value).toBe(
      "12345676-2-13",
    )
    expect((screen.getByLabelText("Város") as HTMLInputElement).value).toBe(
      "Budapest",
    )
  })

  /*
   * A TIPUST A REJTETT MEZO KULDI AZ ALLAPOTBOL. Élőben mérve: a React 19 az
   * action utan alaphelyzetbe allitja az urlapot, es a radio DOM-allapota
   * visszaugrott Magánszemélyre, mikozben a felulet Céget mutatott.
   */
  it("a beküldött típus a React-állapotot követi, nem a rádió DOM-állapotát", () => {
    const { container } = render(<SzamlazasiUrlap cim={null} />)
    const rejtett = () =>
      container.querySelector(
        'input[type="hidden"][name="tipus"]',
      ) as HTMLInputElement
    expect(rejtett().value).toBe("maganszemely")
    fireEvent.click(screen.getByTestId("tipus-ceg"))
    expect(rejtett().value).toBe("ceg")
    // A radiok nem a "tipus" nevet viselik, igy nem kuldenek masodik erteket.
    expect(
      container.querySelectorAll('input[type="radio"][name="tipus"]'),
    ).toHaveLength(0)
  })
})
