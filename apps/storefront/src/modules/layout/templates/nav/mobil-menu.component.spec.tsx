import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import { MobilMenu } from "./mobil-menu"

const gyoker = (id: string, name: string, handle: string) =>
  ({ id, name, handle, category_children: [] }) as never

const KATEGORIAK = [
  gyoker("k1", "Korallok", "korallok"),
  gyoker("k2", "Halak", "halak"),
  gyoker("k3", "Édesvízi akvarisztika", "edesvizi"),
]

/**
 * A MOBIL FEJLEC MENUJE (P1b). A Figma mobil fejlece csak a ket vonalas ikont
 * rajzolja; a panel a meglevo fejlec kepessegeibol all.
 *
 * MI PIROSIT: ha a panel alapbol lathato; ha a gomb nem jelzi az allapotat;
 * ha a kategoriak nem az adatbol jonnek (a harmadik, "idegen" gyoker is kell);
 * ha a kereso nem ugyanarra a cimre, ugyanazzal a mezonevvel kuld; ha az Escape
 * nem zar.
 */
describe("a mobil menü", () => {
  afterEach(cleanup)

  const nyit = () => fireEvent.click(screen.getByTestId("mobil-menu-gomb"))

  it("alapból zárva, a gomb jelzi az állapotát", () => {
    render(<MobilMenu kategoriak={KATEGORIAK} keresoCel="/hu/store" />)
    const gomb = screen.getByTestId("mobil-menu-gomb")
    expect(gomb.getAttribute("aria-expanded")).toBe("false")
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(true)

    nyit()
    expect(gomb.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(false)
  })

  it("a kategóriák az adatból jönnek, mind", () => {
    render(<MobilMenu kategoriak={KATEGORIAK} keresoCel="/hu/store" />)
    nyit()
    for (const handle of ["korallok", "halak", "edesvizi"]) {
      expect(
        screen
          .getByTestId(`mobil-menu-kategoria-${handle}`)
          .getAttribute("href"),
      ).toBe(`/hu/categories/${handle}`)
    }
  })

  it("a kapott rövid nevet mutatja, ha van", () => {
    render(
      <MobilMenu
        kategoriak={KATEGORIAK}
        nevek={new Map([["k3", "Édesvízi"]])}
        keresoCel="/hu/store"
      />,
    )
    nyit()
    expect(
      screen.getByTestId("mobil-menu-kategoria-edesvizi").textContent,
    ).toBe("Édesvízi")
  })

  it("a kereső ugyanoda küld, ugyanazzal a mezőnévvel", () => {
    render(<MobilMenu kategoriak={KATEGORIAK} keresoCel="/hu/store" />)
    nyit()
    const mezo = screen.getByLabelText("Keresés") as HTMLInputElement
    expect(mezo.name).toBe("q")
    expect(mezo.form?.getAttribute("action")).toBe("/hu/store")
    expect(mezo.form?.getAttribute("method")).toBe("get")
  })

  it("az Escape bezárja", () => {
    render(<MobilMenu kategoriak={KATEGORIAK} keresoCel="/hu/store" />)
    nyit()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(true)
  })
})
