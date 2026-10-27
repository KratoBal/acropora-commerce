import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/hirlevel", () => ({
  hirlevelFeliratkozasAkcio: vi.fn(async () => ({ allapot: "kesz" })),
}))
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

import { HIRLEVEL_ALAP } from "./hirlevel-adat"
import { HirlevelSor } from "./hirlevel-sor"
import { LablecKeret } from "./lablec-keret"
import type { LablecAdat } from "./lablec-adat"

const HIRLEVEL = {
  cim: "Hírlevél",
  szoveg: "Iratkozz fel!",
  hozzajarulas: "Hozzájárulok az adataim kezeléséhez.",
  gomb: "Feliratkozás",
}

/*
  A HIRLEVEL-SOR (kirakat-lablec-kep). MI PIROSIT: a hozzajarulas melletti
  link nem az adatkezelesi tajekoztatora visz; a mezo vagy a doboz neve nem
  az, amit a szerveroldali akcio olvas; a kikapcsolt sor megis latszik.
*/
describe("a hírlevél-sor", () => {
  afterEach(cleanup)

  it("az OS szövegei, a két mező, a hozzájárulás a tájékoztató linkjével", () => {
    render(<HirlevelSor hirlevel={HIRLEVEL} />)

    expect(screen.getByRole("heading", { name: "Hírlevél" })).toBeTruthy()
    expect(screen.getByText("Iratkozz fel!")).toBeTruthy()
    expect(screen.getByLabelText("Név").getAttribute("name")).toBe("name")
    expect(screen.getByLabelText("E-mail").getAttribute("name")).toBe("email")
    expect(screen.getByRole("checkbox").getAttribute("name")).toBe("consent")
    expect(
      screen.getByTestId("hirlevel-adatkezeles").getAttribute("href"),
    ).toBe("/jogi/adatkezeles")
    expect(screen.getByRole("button", { name: "Feliratkozás" })).toBeTruthy()
  })

  /*
    A KIFEJEZES MAGA A LINK (barracuda, #580): a bolt alapszovegeben az
    „Adatkezelési tájékoztatót” all; ha utana kulon link is allna, a kifejezes
    ketszer latszana, es a latott szoveg egy szoval hosszabb lenne, mint a
    rogzitett hozzajarulas.
  */
  it("a hozzájárulás szövegében a tájékoztató kifejezése a link, egyszer, és a látott szöveg a rögzített", () => {
    const { container } = render(
      <HirlevelSor
        hirlevel={{ ...HIRLEVEL, hozzajarulas: HIRLEVEL_ALAP.consent_text }}
      />,
    )
    const linkek = screen.getAllByTestId("hirlevel-adatkezeles")
    expect(linkek).toHaveLength(1)
    expect(linkek[0]!.textContent).toBe("Adatkezelési tájékoztatót")
    const sor = container.querySelector("label span")!
    expect(sor.textContent).toBe(HIRLEVEL_ALAP.consent_text)
  })

  it("ha a szöveg nem nevezi meg a tájékoztatót, a link utána áll", () => {
    render(<HirlevelSor hirlevel={HIRLEVEL} />)
    expect(screen.getByTestId("hirlevel-adatkezeles").textContent).toBe(
      "Adatkezelési tájékoztató",
    )
  })

  it("a lábléc a sort csak bekapcsolva rajzolja", () => {
    const lablec: LablecAdat = {
      bemutatkozo: null,
      oszlopok: [],
      kozossegi: [],
      alsoSor: null,
      hirlevel: null,
    }
    render(<LablecKeret lablec={lablec} />)
    expect(screen.queryByTestId("lablec-hirlevel")).toBeNull()
    cleanup()
    render(<LablecKeret lablec={{ ...lablec, hirlevel: HIRLEVEL }} />)
    expect(screen.getByTestId("lablec-hirlevel")).toBeTruthy()
  })
})
