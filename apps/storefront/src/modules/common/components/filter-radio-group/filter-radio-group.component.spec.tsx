import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import FilterRadioGroup, { csoportNev } from "./index"

afterEach(cleanup)

const TETELEK = [
  { value: "created_at", label: "Legújabbak" },
  { value: "price_asc", label: "Ár szerint növekvő" },
]

/**
 * A RENDEZES BILLENTYUZETTEL (audit P1/7, H2). MI PIROSIT: ha a radiok ismet
 * `hidden` (display: none) osztalyt kapnak, mert az elem nem fokuszalhato; ha
 * nincs kozos `name` (a nyilak nem lepnek a csoportban); ha a csoportnak nincs
 * hozzaferheto neve (a cim); ha a kivalasztott radio nem a ertek szerinti; ha a
 * valtozas nem jut el a kezelohoz. A jsdom nem forditja le a Tailwindet, ezert a
 * fokuszalhatosag JELOLESE merheto (nincs `hidden`, van `sr-only`), nem a festett
 * allapot.
 */
describe("a szűrő rádiócsoport", () => {
  it("a rádiók fókuszálhatók: nem rejtettek, láthatatlanok (sr-only), egy csoportot alkotnak", () => {
    render(
      <FilterRadioGroup
        title="Rendezés"
        items={TETELEK}
        value="created_at"
        handleChange={() => {}}
      />,
    )
    const radiok = screen.getAllByRole("radio") as HTMLInputElement[]
    expect(radiok).toHaveLength(2)
    for (const r of radiok) {
      expect(r.className).not.toMatch(/(^|\s)hidden(\s|$)/)
      expect(r.className).toContain("sr-only")
      expect(r.name).toBe("rendezes")
    }
  })

  it("a csoportnak a cím a hozzáférhető neve", () => {
    render(
      <FilterRadioGroup
        title="Rendezés"
        items={TETELEK}
        value="created_at"
        handleChange={() => {}}
      />,
    )
    expect(screen.getByRole("radiogroup", { name: "Rendezés" })).toBeTruthy()
  })

  it("a kiválasztott érték be van jelölve, és egy másik rádió a kezelőt hívja", () => {
    const kezelo = vi.fn()
    render(
      <FilterRadioGroup
        title="Rendezés"
        items={TETELEK}
        value="created_at"
        handleChange={kezelo}
      />,
    )
    const [elso, masodik] = screen.getAllByRole("radio") as HTMLInputElement[]
    expect(elso!.checked).toBe(true)
    expect(masodik!.checked).toBe(false)
    fireEvent.click(masodik!)
    expect(kezelo).toHaveBeenCalledWith("price_asc")
  })

  it("a fókuszált sor látható keretet kap (focus-within)", () => {
    render(
      <FilterRadioGroup
        title="Rendezés"
        items={TETELEK}
        value="created_at"
        handleChange={() => {}}
      />,
    )
    const sor = screen.getAllByRole("radio")[0]!.parentElement!.parentElement!
    expect(sor.className).toContain("focus-within:outline")
  })

  it("a csoport neve a címből készül, ékezet nélkül", () => {
    expect(csoportNev("Rendezés")).toBe("rendezes")
    expect(csoportNev("Ár szerint")).toBe("ar-szerint")
    expect(csoportNev("!!!")).toBe("szuro")
  })
})
