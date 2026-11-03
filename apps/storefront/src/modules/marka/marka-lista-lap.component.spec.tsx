import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { MarkaListaLap } from "./marka-lista-lap"

const MARKAK = [
  { name: "Zoanthus Lab", handle: "zoanthus-lab" },
  { name: "Árnyék", handle: "arnyek" },
  { name: "Aqua Medic", handle: "aqua-medic" },
  { name: "7 Seas", handle: "7-seas" },
]

/*
  A FORGALMAZOTT MARKAK LISTAJA (kirakat-lablec-kep). MI PIROSIT: a lista nem
  nev szerint rendezett (magyar ABC-vel: az "Á" az "A" utan, nem a "Z" utan);
  egy marka nem a sajat markaoldalara visz; ures listanal ures racs all a
  mondat helyett; a betu-sav egy betut sem hagy ki, es nem az ures szakaszokra
  mutat; a cim vagy a morzsa nem a lap nyelven all.
*/
describe("a forgalmazott márkák lapja", () => {
  afterEach(cleanup)

  it("betűnként csoportosít, magyar sorrendben, és a márkaoldalra visz", () => {
    render(<MarkaListaLap markak={MARKAK} />)

    const fejek = screen.getAllByRole("heading", { level: 2 })
    expect(fejek.map((h) => h.textContent)).toEqual(["#", "A", "Á", "Z"])
    const link = screen.getByRole("link", { name: "Aqua Medic" })
    expect(link.getAttribute("href")).toBe("/marka/aqua-medic")
    expect(screen.queryByTestId("marka-lista-ures")).toBeNull()
  })

  it("a cím, a morzsa és a darabszám a közös keretben áll", () => {
    render(<MarkaListaLap markak={MARKAK} />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Forgalmazott márkák",
    )
    const morzsa = screen.getByRole("navigation", { name: "Morzsamenü" })
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Márkák",
    )
    expect(screen.getByTestId("marka-darab").textContent).toBe("4 márka")
  })

  it("a betű-sáv minden szakaszra mutat, és minden cél létezik", () => {
    render(<MarkaListaLap markak={MARKAK} />)

    const sav = screen.getByTestId("marka-betuk")
    const cimek = within(sav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
    expect(cimek).toEqual([
      "#marka-betu-szam",
      "#marka-betu-A",
      "#marka-betu-Á",
      "#marka-betu-Z",
    ])
    for (const cim of cimek) {
      expect(document.getElementById(cim!.slice(1))).not.toBeNull()
    }
  })

  it("üres listánál egy mondat áll, nem üres rács, és nincs betű-sáv", () => {
    render(<MarkaListaLap markak={[]} />)

    expect(screen.getByTestId("marka-lista-ures").textContent).toContain(
      "nincs megjeleníthető márka",
    )
    expect(screen.queryAllByRole("link")).toHaveLength(0)
    expect(screen.queryByTestId("marka-betuk")).toBeNull()
  })

  it("az angol szegmensen a cím, a morzsa és a darabszám angolul áll", () => {
    render(<MarkaListaLap markak={MARKAK} countryCode="en-hu" />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Brands we sell",
    )
    const morzsa = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Brands",
    )
    expect(screen.getByTestId("marka-darab").textContent).toBe("4 brands")
  })
})
