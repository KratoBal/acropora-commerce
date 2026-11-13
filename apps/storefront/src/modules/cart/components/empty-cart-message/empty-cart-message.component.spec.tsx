import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import EmptyCartMessage from "./index"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * AZ URES KOSAR NEM HIBAALLAPOT, HANEM KIINDULOPONT.
 *
 * A terv harom ajanlot mutat, mert az ures kosar az a pillanat, amikor a vevo
 * nem tudja, hol kezdje. Egy puszta "a kosar ures" felirat zsakutca.
 */
describe("az üres kosár", () => {
  it("mindhárom kiindulópont ott áll, hivatkozással", () => {
    render(<EmptyCartMessage countryCode="hu" />)

    const ajanlok = screen.getAllByTestId("empty-cart-ajanlo")
    expect(ajanlok).toHaveLength(3)
    for (const ajanlo of ajanlok) {
      expect(ajanlo).toHaveAttribute("href", expect.stringContaining("/hu/"))
    }
  })

  /**
   * A TERVBEN "31 egyedi peldany" all. A HARMINCEGY ELO SZAM: a keszlettol fugg,
   * es hetente valtozik. Beegetve harom nap mulva hazudna, es senki nem venne
   * eszre, mert egy szam nem hibazik.
   *
   * EZ AZ ALLITAS TEHAT NEM A SZOVEGET VEDI, HANEM A SZABALYT: amig a szamlalo
   * lekerdezes nincs bekotve, szam NEM allhat ebben a blokkban.
   */
  it("nem áll kitalált darabszám az ajánlókban", () => {
    render(<EmptyCartMessage countryCode="hu" />)

    for (const ajanlo of screen.getAllByTestId("empty-cart-ajanlo")) {
      expect(ajanlo.textContent ?? "").not.toMatch(/\d/)
    }
  })

  /**
   * A KOSAR A KEZDOLAP STILUSAT KAPJA (Balazs 2026-11-02 "mindegyik mehet", mint a kategorialap, #748): a cim a kezdolap
   * szerif betuje, normal vastagsaggal. MI PIROSIT: ha a cim a vilagos talpatlan marad.
   */
  it("a cím a kezdőlap szerif betűjével, normál vastagsággal", () => {
    render(<EmptyCartMessage countryCode="hu" />)

    const cim = screen.getByRole("heading", { level: 1 }).className
    expect(cim).toContain("font-kiemelt")
    expect(cim).toContain("font-normal")
    expect(cim).toContain("tracking-[-0.01em]")
    expect(cim).not.toContain("font-light")
  })

  it("a bolt telefonszáma hívható hivatkozás", () => {
    render(<EmptyCartMessage countryCode="hu" />)

    expect(
      screen.getByRole("link", { name: /\+36 20 267 6801/ }),
    ).toHaveAttribute("href", "tel:+36202676801")
  })
})
