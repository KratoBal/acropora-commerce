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

import { CEG } from "./hivatkozasok"
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
    render(<LablecKeret lablec={LABLEC} />)

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
    render(<LablecKeret lablec={LABLEC} />)

    const sik = screen.getByTestId("lablec-sik").className.split(/\s+/)
    expect(sik).toContain("w-full")
    expect(sik).not.toContain("max-w-[1440px]")
  })

  it("a bemutatkozó sor csak kitöltött bemutatkozással vagy közösségi linkkel áll", () => {
    render(<LablecKeret lablec={LABLEC} />)
    expect(screen.queryByTestId("lablec-bemutatkozo-sor")).toBeNull()
    cleanup()

    render(
      <LablecKeret
        lablec={{ ...LABLEC, bemutatkozo: "<p>Tengeri akvarisztika</p>" }}
      />,
    )
    expect(screen.getByTestId("footer-bemutatkozo").textContent).toBe(
      "Tengeri akvarisztika",
    )
  })

  /**
   * A REFERENCIA SZERKEZETE (kirakat-lablec-kep, 2026-10-27): a link-oszlopok
   * es a ceges oszlop EGY racsban, nagy kepernyon negy oszlopban.
   */
  it("a link-oszlopok és a céges oszlop egy rácsban állnak", () => {
    render(<LablecKeret lablec={LABLEC} />)

    const racs = screen.getByTestId("lablec-oszlopok")
    expect(racs.className.split(/\s+/)).toContain("lg:grid-cols-4")
    expect(screen.getByTestId("footer-ceg").parentElement).toBe(racs)
    expect(
      screen.getByTestId("footer-oszlop-informaciok").parentElement
        ?.parentElement,
    ).toBe(racs)
  })

  it("a céges oszlop a fix cégadatot mutatja", () => {
    render(<LablecKeret lablec={LABLEC} />)

    const ceg = screen.getByTestId("footer-ceg").textContent ?? ""
    for (const resz of [CEG.nev, CEG.cim, CEG.telefon, CEG.email])
      expect(ceg).toContain(resz)
    expect(screen.getByTestId("footer-nyitvatartas").textContent).toBe(
      `Nyitvatartás: ${CEG.nyitvatartas.join("")}`,
    )
  })

  /**
   * A FIX ALSO SOR: Foxpost, GLS, Stripe es a kartyak kepe, ebben a sorrendben.
   * A regi bolt harom eleme (Arukereso, Olcsobbat, SimplePay) NEM kerul ide.
   */
  it("az alsó sor a négy fix logó, a régi bolt három eleme nélkül", () => {
    render(<LablecKeret lablec={LABLEC} />)

    const kepek = Array.from(
      screen.getByTestId("lablec-logosor").querySelectorAll("img"),
    )
    expect(kepek.map((k) => k.getAttribute("alt"))).toEqual([
      "FOXPOST – Packeta Group",
      "GLS",
      "Stripe",
      "Fizetési opciók: Google Pay, Apple Pay, Mastercard, Maestro, Visa",
    ])
    const sav = screen.getByTestId("lablec-also-sav").innerHTML.toLowerCase()
    for (const tilos of ["simplepay", "árukereső", "arukereso", "olcsobbat"])
      expect(sav).not.toContain(tilos)
  })
})
