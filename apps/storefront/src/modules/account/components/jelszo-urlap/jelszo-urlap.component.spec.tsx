import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const muveletek = vi.hoisted(() => ({ changePassword: vi.fn() }))
vi.mock("@lib/data/customer", () => muveletek)

import JelszoUrlap from "."

afterEach(() => cleanup())

const ertek = (cimke: string) =>
  (screen.getByLabelText(cimke) as HTMLInputElement).value
const kitolt = () => {
  for (const [cimke, szoveg] of [
    ["Jelenlegi jelszó", "regi-jelszo"],
    ["Új jelszó", "uj-jelszo"],
    ["Új jelszó újra", "uj-jelszo"],
  ])
    fireEvent.change(screen.getByLabelText(cimke), {
      target: { value: szoveg },
    })
}
const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("jelszo-urlap"))
  })
}

/**
 * A JELSZO MODOSITASA (257:191). MI PIROSIT: ha a harom mezo nem jelszo tipusu
 * vagy nem kotelezo; ha a gomb felirata nem a kerete; ha a siker vagy a hiba
 * nem latszik; ha egy jelszo a bekuldes utan a mezoben marad.
 */
describe("a jelszó módosítása", () => {
  it("három kötelező jelszómező, a böngésző jelszókezelőjének jelölve", () => {
    render(<JelszoUrlap />)
    expect(screen.getByRole("heading").textContent).toBe("Jelszó módosítása")
    for (const [cimke, auto] of [
      ["Jelenlegi jelszó", "current-password"],
      ["Új jelszó", "new-password"],
      ["Új jelszó újra", "new-password"],
    ]) {
      const mezo = screen.getByLabelText(cimke) as HTMLInputElement
      expect(mezo.type).toBe("password")
      expect(mezo.required).toBe(true)
      expect(mezo.autocomplete).toBe(auto)
    }
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Jelszó mentése",
    ])
  })

  it("siker után a mezők üresek, és kimondja, hogy megváltozott", async () => {
    muveletek.changePassword.mockResolvedValue({ state: "success" })
    render(<JelszoUrlap />)
    kitolt()
    await bekuld()
    expect(muveletek.changePassword).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("jelszo-siker").textContent).toBe(
      "A jelszó megváltozott.",
    )
    expect(ertek("Jelenlegi jelszó")).toBe("")
    expect(ertek("Új jelszó")).toBe("")
    expect(ertek("Új jelszó újra")).toBe("")
  })

  it("hibánál a mondat látszik, és a jelszavak sem maradnak a mezőben", async () => {
    muveletek.changePassword.mockResolvedValue({
      state: "error",
      error: "A jelenlegi jelszó nem helyes.",
    })
    render(<JelszoUrlap />)
    kitolt()
    await bekuld()
    expect(screen.getByTestId("jelszo-hiba").textContent).toBe(
      "A jelenlegi jelszó nem helyes.",
    )
    expect(screen.getByTestId("jelszo-siker").textContent).toBe("")
    expect(ertek("Jelenlegi jelszó")).toBe("")
  })
})
