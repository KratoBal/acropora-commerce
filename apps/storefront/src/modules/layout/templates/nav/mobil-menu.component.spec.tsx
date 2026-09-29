import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import { fejlecMenuPontok } from "@lib/util/fejlec-menu-pontok"
import { MobilMenu } from "./mobil-menu"

const kat = (handle: string, category_children: unknown[] = []) =>
  ({ id: handle, name: handle, handle, category_children }) as never

const PONTOK = fejlecMenuPontok([
  kat("korallok"),
  kat("halak"),
  kat("termékek", [kat("vízkezelés---termékek")]),
])

/**
 * A MOBIL FEJLEC MENUJE. A Figma mobil fejlece (220:3) csak a ket vonalas
 * ikont rajzolja; a panel a meglevo fejlec kepessegeibol all, es ugyanazt a
 * nyolc menupontot mutatja, mint az asztali menu.
 *
 * MI PIROSIT: ha a panel alapbol lathato; ha a gomb nem jelzi az allapotat;
 * ha a pontok nem a keret sorrendjeben, nem a feloldott celra mutatnak; ha a
 * kereso nem ugyanarra a cimre, ugyanazzal a mezonevvel kuld; ha az Escape
 * nem zar; ha az ikon vonala nem a Figma 1.5 pixele.
 */
describe("a mobil menü", () => {
  afterEach(cleanup)

  const nyit = () => fireEvent.click(screen.getByTestId("mobil-menu-gomb"))

  it("alapból zárva, a gomb jelzi az állapotát", () => {
    render(<MobilMenu pontok={PONTOK} keresoCel="/hu/store" />)
    const gomb = screen.getByTestId("mobil-menu-gomb")
    expect(gomb.getAttribute("aria-expanded")).toBe("false")
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(true)

    nyit()
    expect(gomb.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(false)
  })

  it("a nyolc pont a keret sorrendjében, a feloldott célra mutat", () => {
    render(<MobilMenu pontok={PONTOK} keresoCel="/hu/store" />)
    nyit()
    const linkek = Array.from(
      screen
        .getByTestId("mobil-menu-panel")
        .querySelectorAll("[data-testid^='mobil-menu-pont-']"),
    ).map((a) => `${a.textContent}=${a.getAttribute("href")}`)
    expect(linkek).toEqual([
      "Korallok=/hu/categories/korallok",
      "Halak=/hu/categories/halak",
      "Gerinctelenek=/hu/hamarosan/gerinctelenek",
      "Technika=/hu/hamarosan/technika",
      "Vízkezelés=/hu/categories/vízkezelés---termékek",
      "Tudástár=/hu/hamarosan/tudastar",
      "Szolgáltatások=/hu/hamarosan/szolgaltatasok",
      "Akváriumaim=/hu/hamarosan/akvariumaim",
    ])
  })

  it("a menü-ikon két vonala a Figma szerint 1.5 pixeles", () => {
    render(<MobilMenu pontok={PONTOK} keresoCel="/hu/store" />)
    const vonalak = screen
      .getByTestId("mobil-menu-gomb")
      .querySelectorAll("span")
    expect(vonalak).toHaveLength(2)
    for (const vonal of Array.from(vonalak)) {
      expect(vonal.className).toContain("h-[1.5px]")
    }
  })

  it("a kereső ugyanoda küld, ugyanazzal a mezőnévvel", () => {
    render(<MobilMenu pontok={PONTOK} keresoCel="/hu/store" />)
    nyit()
    const mezo = screen.getByLabelText("Keresés") as HTMLInputElement
    expect(mezo.name).toBe("q")
    expect(mezo.form?.getAttribute("action")).toBe("/hu/store")
    expect(mezo.form?.getAttribute("method")).toBe("get")
  })

  it("az Escape bezárja", () => {
    render(<MobilMenu pontok={PONTOK} keresoCel="/hu/store" />)
    nyit()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.getByTestId("mobil-menu-panel").hidden).toBe(true)
  })
})
