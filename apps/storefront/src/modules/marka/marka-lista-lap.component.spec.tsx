import { cleanup, render, screen } from "@testing-library/react"
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

/*
  A FORGALMAZOTT MARKAK LISTAJA (kirakat-lablec-kep). MI PIROSIT: a lista nem
  nev szerint rendezett (magyar ABC-vel: az "Á" az "A" utan, nem a "Z" utan);
  egy marka nem a sajat markaoldalara visz; ures listanal ures racs all a
  mondat helyett.
*/
describe("a forgalmazott márkák lapja", () => {
  afterEach(cleanup)

  it("betűnként csoportosít, magyar sorrendben, és a márkaoldalra visz", () => {
    render(
      <MarkaListaLap
        cim="Forgalmazott márkák"
        markak={[
          { name: "Zoanthus Lab", handle: "zoanthus-lab" },
          { name: "Árnyék", handle: "arnyek" },
          { name: "Aqua Medic", handle: "aqua-medic" },
          { name: "7 Seas", handle: "7-seas" },
        ]}
      />,
    )

    const fejek = screen.getAllByRole("heading", { level: 2 })
    expect(fejek.map((h) => h.textContent)).toEqual(["#", "A", "Á", "Z"])
    const link = screen.getByRole("link", { name: "Aqua Medic" })
    expect(link.getAttribute("href")).toBe("/marka/aqua-medic")
    expect(screen.queryByTestId("marka-lista-ures")).toBeNull()
  })

  it("üres listánál egy mondat áll, nem üres rács", () => {
    render(<MarkaListaLap cim="Forgalmazott márkák" markak={[]} />)

    expect(screen.getByTestId("marka-lista-ures").textContent).toContain(
      "nincs megjeleníthető márka",
    )
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})
