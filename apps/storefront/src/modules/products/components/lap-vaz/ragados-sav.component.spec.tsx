import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import RagadosSav, { vanTartalma } from "./ragados-sav"

afterEach(cleanup)

describe("a lap alján futó sáv", () => {
  /**
   * A LEGFONTOSABB ALLITAS, ES NEM A MEGJELENESROL SZOL.
   *
   * Egy ures ragado csik a lap aljan NEM "meg nincs kesz", hanem hiba: a
   * felhasznalo egy savot lat, ami semmit nem mond es elveszi a helyet. A
   * tobbi doboznal az ures allapot BECSULETES (latszik a hely); itt nem az.
   */
  it("tartalom nélkül semmit nem rajzol", () => {
    const { container } = render(<RagadosSav />)

    expect(container.firstChild).toBeNull()
  })

  it("bármelyik rész elég ahhoz, hogy megjelenjen", () => {
    expect(vanTartalma({ cimke: "x" })).toBe(true)
    expect(vanTartalma({ ar: "x" })).toBe(true)
    expect(vanTartalma({ cselekves: "x" })).toBe(true)
    expect(vanTartalma({})).toBe(false)
  })

  /**
   * A HAROM RESZ KULON DOBOZBA KERUL. Ha valaha egymasba csusznanak, a
   * kimenet ugyanaz a szoveg lenne, csak mas szerkezettel -- es egy
   * "tartalmazza a szoveget" allitas ezt NEM venne eszre.
   */
  it("a címke, az ár és a cselekvés külön helyre kerül", () => {
    render(
      <RagadosSav
        cimke={<span data-testid="c">Utolsó darab</span>}
        ar={<span data-testid="a">24 900 Ft</span>}
        cselekves={<button data-testid="k">Kosárba</button>}
      />,
    )

    const cimke = screen.getByTestId("ragados-sav-cimke")
    const ar = screen.getByTestId("ragados-sav-ar")
    const cselekves = screen.getByTestId("ragados-sav-cselekves")

    expect(cimke.textContent).toBe("Utolsó darab")
    expect(ar.textContent).toBe("24 900 Ft")
    expect(cselekves.textContent).toBe("Kosárba")

    // es NEM egymasban: egyik sem tartalmazhatja a masik szoveget
    expect(cimke.textContent).not.toContain("24 900")
    expect(cselekves.textContent).not.toContain("Utolsó")
  })

  /**
   * A HIANYZO RESZ NEM HAGY URES DOBOZT. A tervben a sav harom resze kozul a
   * cimke a legkevesbe biztos (a keszlet-allapot nem minden termeken all), es
   * egy ures `div` ott fuggoleges helyet foglalna.
   */
  it("hiányzó rész nem hagy üres helyet", () => {
    render(<RagadosSav ar={<span>24 900 Ft</span>} />)

    expect(screen.queryByTestId("ragados-sav-cimke")).toBeNull()
    expect(screen.queryByTestId("ragados-sav-cselekves")).toBeNull()
    expect(screen.getByTestId("ragados-sav-ar")).toBeTruthy()
  })

  /**
   * A RAGADAS MAGA. A tervben `position:sticky; bottom:0` all -- NEM `fixed`.
   * A kulonbseg lathato: a fixed a lapon KIVUL rogzit, a sticky a SZULOJEN
   * belul. Ha valaki "egyszerusit" es fixed-re irja, ez pirosodik ki.
   *
   * A HALO HATARA: a jsdom nem szamol elrendezest, tehat az OSZTALYT meri,
   * nem a tenyleges ragadast. Azt a lapon kell megnezni.
   */
  it("a terv szerint sticky, nem fixed", () => {
    render(<RagadosSav ar={<span>24 900 Ft</span>} />)

    const sav = screen.getByTestId("ragados-sav")
    expect(sav.className).toContain("sticky")
    expect(sav.className).toContain("bottom-0")
    expect(sav.className).not.toContain("fixed")
  })
})
