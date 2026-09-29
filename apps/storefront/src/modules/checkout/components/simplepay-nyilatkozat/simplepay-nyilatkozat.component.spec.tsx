import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import SimplePayNyilatkozat from "./index"

afterEach(cleanup)

/**
 * A SIMPLEPAY LOGO ES NYILATKOZAT (P4-4). MI PIROSIT: ha a logo nem a Fizetesi
 * Tajekoztatora mutat; ha a nyilatkozatbol hianyzik a szerzodes szerinti ceg,
 * szekhely, webcim vagy a tovabbitott adatok kore; ha a jelolo nem jelzi az
 * elfogadast.
 */
describe("a SimplePay nyilatkozat", () => {
  it("a logó a Fizetési Tájékoztatóra mutat, új lapon", () => {
    render(<SimplePayNyilatkozat elfogadva={false} onValtozas={() => {}} />)
    const link = screen.getByTestId("simplepay-logo-link")
    expect(link).toHaveAttribute(
      "href",
      "https://simplepartner.hu/PaymentService/Fizetesi_tajekoztato.pdf",
    )
    expect(link).toHaveAttribute("target", "_blank")
    expect(link.querySelector("img")).toHaveAttribute(
      "src",
      "/simplepay/simplepay-kartyak.png",
    )
  })

  it("a nyilatkozat a végleges adatokkal áll, az adatkezelési tájékoztató linkjével", () => {
    render(<SimplePayNyilatkozat elfogadva={false} onValtozas={() => {}} />)
    const szoveg = screen.getByTestId("simplepay-nyilatkozat").textContent ?? ""
    expect(szoveg).toContain(
      "Acropora Kft. (1106 Budapest, Pesti Gábor utca 35.)",
    )
    expect(szoveg).toContain("a shop.acropora.hu felhasználói adatbázisában")
    expect(szoveg).toContain("SimplePay Zrt., mint adatfeldolgozó")
    expect(szoveg).toContain("név, e-mail cím, számlázási cím, telefonszám")
    expect(
      screen.getByRole("link", {
        name: "https://simplepay.hu/adatkezelesi-tajekoztatok/",
      }),
    ).toHaveAttribute("href", "https://simplepay.hu/adatkezelesi-tajekoztatok/")
  })

  it("a jelölő az elfogadást jelzi", () => {
    const onValtozas = vi.fn()
    render(<SimplePayNyilatkozat elfogadva={false} onValtozas={onValtozas} />)
    fireEvent.click(screen.getByTestId("simplepay-nyilatkozat-jelolo"))
    expect(onValtozas).toHaveBeenCalledWith(true)
  })
})
