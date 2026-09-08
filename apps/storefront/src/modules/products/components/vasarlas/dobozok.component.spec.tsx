import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ElerhetosegDoboz } from "./dobozok"

afterEach(cleanup)

/**
 * AZ ELERHETOSEG-DOBOZ, ES AMIERT EPP EZ AZ EGY A NEGYBOL.
 *
 * A masik harom doboz (ar, valaszto, mennyiseg) a vasarlasi KONTEXTUSBOL olvas,
 * es provider nelkul `null`-t ad -- azokat a megepitett lapon kell merni. Ez a
 * doboz TISZTA MEGJELENITES: ket tenyt kap parameterben, es a sajat fejlece
 * mondja ki, miert nem kontextusbol veszi oket. Ezert merheto itt, egyedul.
 *
 * MIERT KERULT IDE MOST: a doboz alakjat egyetlen allitas sem merte. Ugyanaz a
 * csend, ami a panel hattereen is allt: a `Kiszerelés: X` sor barmikor
 * elmozdulhatott volna, es semmi nem szolt volna.
 *
 * AMIT MER: a melyedes tokenjet es a sorok ALAKJAT (cimke-ertek par kontra
 * teljes szelessegu mondat). AMIT NEM: a festett szint -- a jsdom nem oldja fel
 * a CSS-valtozokat, tehat itt a token NEVE merheto, az ERTEKE a
 * `terv-tokenek.spec.ts`-ben all.
 */
describe("az elérhetőség-doboz mélyedése", () => {
  it("a mélyedés a lap tokenjét viseli, nem a panelét", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    expect(screen.getByTestId("elerhetoseg-melyedes").style.background).toBe(
      "var(--terv-hatter)",
    )
  })

  /**
   * A KISZERELES CIMKE-ERTEK PAR, A TERV SZERINT. A regi alak EGY mondat volt
   * (`Kiszerelés: 1 db`), a tervben viszont a cimke balra, az ertek jobbra all.
   * Ezert a KET RESZT kulon allitjuk, nem a teljes szoveget: egy osszefuzott
   * szoveg akkor is egyezne, ha a ket resz egy elembe kerulne vissza.
   */
  it("a kiszerelés címke és érték, két külön részben", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    const sor = screen.getByTestId("vaz-egyseg")
    const reszek = Array.from(sor.querySelectorAll("span"))

    expect(reszek).toHaveLength(2)
    expect(reszek[0].textContent).toBe("Kiszerelés")
    expect(reszek[1].textContent).toBe("1 db")
    expect(reszek[0].style.color).toBe("var(--terv-szoveg-halvany)")
    expect(sor.className).toContain("justify-between")
  })

  /**
   * A RENDELESI MONDAT NEM PAR, ES EZ KULON ALLITAS. Ha valaki egyszer
   * "egysegesitene" a ket sort, ez pirosodik -- es az a helyes, mert a
   * mondathoz cimket kellene KITALALNI.
   */
  it("a rendelési mondat egyben áll, cimke nélkül", () => {
    render(<ElerhetosegDoboz rendelesiMondat="Legalább 2 darab rendelhető." />)

    const p = screen.getByTestId("vaz-rendelesi-mondat")

    expect(p.querySelectorAll("span")).toHaveLength(0)
    expect(p.textContent).toBe("Legalább 2 darab rendelhető.")
  })

  /**
   * ISMERT POZITIV KONTROLL A HIANY-AGRA. Enelkul a fenti harom allitas nem
   * mondana meg, hogy a doboz a PARAMETEREKTOL fugg -- csak azt, hogy amikor
   * megjelenik, jol nez ki.
   */
  it("adat nélkül semmit nem rajzol", () => {
    const { container } = render(<ElerhetosegDoboz />)

    expect(container.firstChild).toBeNull()
  })

  it("a két adat egymás mellett is megáll", () => {
    render(
      <ElerhetosegDoboz
        kiszereles="1 db"
        rendelesiMondat="Legalább 2 darab."
      />,
    )

    const melyedes = screen.getByTestId("elerhetoseg-melyedes")
    expect(melyedes.querySelector('[data-testid="vaz-egyseg"]')).toBeTruthy()
    expect(
      melyedes.querySelector('[data-testid="vaz-rendelesi-mondat"]'),
    ).toBeTruthy()
  })
})
