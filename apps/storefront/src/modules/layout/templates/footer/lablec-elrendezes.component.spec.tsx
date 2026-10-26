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

import { LablecKeret } from "./lablec-keret"
import type { LablecAdat } from "./lablec-adat"

const LABLEC: LablecAdat = {
  bemutatkozo: null,
  oszlopok: [
    {
      azonosito: "informaciok",
      cim: "Információk",
      linkek: [{ cimke: "Szállítás", href: "/szallitas", sajat: true }],
    },
  ],
  cim: "1106 Budapest",
  nyitvatartas: ["Kedd-Péntek 10-18"],
  kozossegi: [],
  alsoSor: null,
}

/**
 * A LABLEC ELRENDEZESE 1440 PIXELEN (commerce-lablec-igazitas, 2026-10-26).
 *
 * A jsdom nem szamol elrendezest, ezert az OSZTALYOKAT meri, amikbol a ket mert
 * hiba kovetkezett: (1) a bal oszlop (a bolt neve) a rugalmas sorban
 * osszezsugorodott, es ranyult a Kollekciok oszlopra; (2) a tartalom 24
 * pixeles margoval a lap szelehez tapadt, mikozben a fejlec es a termeklap vaza
 * 64 pixelnel kezdodik.
 *
 * MI PIROSIT: a bal oszlop ujra zsugorodhat (a `shrink-0` vagy a rogzitett
 * szelesseg eltunik); a racs elveszti a `min-w-0`-t; a tartalom elhagyja az
 * 1440 pixeles keretet vagy a 64 pixeles asztali margot; a sik hattere
 * keretbe kerul (a `<footer>` marad teljes szelessegu).
 */
describe("a lábléc elrendezése", () => {
  afterEach(cleanup)

  it("a tartalom az 1440 pixeles keretben áll, 64 pixeles asztali margóval", () => {
    render(<LablecKeret lablec={LABLEC} collections={null} />)

    const osztalyok = screen
      .getByTestId("lablec-konteiner")
      .className.split(/\s+/)
    expect(osztalyok).toContain("max-w-[1440px]")
    expect(osztalyok).toContain("mx-auto")
    expect(osztalyok).toContain("px-4")
    expect(osztalyok).toContain("lg:px-16")
    // a jelolo nem a regi 24 pixeles margo
    expect(osztalyok).not.toContain("px-6")
  })

  it("a sík (a footer) nem kap szélességkorlátot", () => {
    render(<LablecKeret lablec={LABLEC} collections={null} />)

    const sik = screen.getByTestId("lablec-sik").className.split(/\s+/)
    expect(sik).toContain("w-full")
    expect(sik).not.toContain("max-w-[1440px]")
  })

  it("a bal oszlop rögzített szélességű és nem zsugorodik", () => {
    render(<LablecKeret lablec={LABLEC} collections={null} />)

    const osztalyok = screen
      .getByTestId("lablec-bemutatkozo-oszlop")
      .className.split(/\s+/)
    expect(osztalyok).toContain("shrink-0")
    expect(osztalyok).toContain("xsmall:w-64")
    expect(osztalyok).not.toContain("max-w-sm")
  })

  it("az info-oszlopok rácsa összezsugorodhat a bal oszlop mellett", () => {
    render(<LablecKeret lablec={LABLEC} collections={null} />)

    const racs = screen.getByTestId("footer-ceg").parentElement as HTMLElement
    const osztalyok = racs.className.split(/\s+/)
    expect(osztalyok).toContain("min-w-0")
    expect(osztalyok).toContain("lg:grid-cols-6")
  })

  /**
   * A KOLLEKCIOK LINKJEI A TERV SZOVEGSZINET VISELIK, mint a tobbi oszlop. A
   * jsdom nem szamol szint a stiluslapbol, ezert a beagyazott stilust meri: a
   * hiany (a bongeszo alapszine) a sotet lapon alig lathato szoveget adott.
   * A kontroll: a masik oszlop listaja ugyanezt az erteket viseli, tehat az
   * allitas nem egy ures vilagot elegit ki.
   */
  it("a kollekciók listája ugyanazt a színt viseli, mint a többi oszlop", () => {
    render(
      <LablecKeret
        lablec={LABLEC}
        collections={[
          { id: "c1", handle: "easyphyt", title: "Easyphyt" },
          { id: "c2", handle: "coralbox", title: "CoralBox" },
        ]}
      />,
    )

    const kollekciok = screen.getByTestId("footer-kollekciok")
    const masik = screen.getByTestId("footer-oszlop-informaciok")
    expect(masik.style.color).toBe("var(--terv-szoveg-halvany)")
    expect(kollekciok.style.color).toBe("var(--terv-szoveg-halvany)")
  })
})
