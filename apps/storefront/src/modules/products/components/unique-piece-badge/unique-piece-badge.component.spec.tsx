import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import UniquePieceBadge, { UniquePiecePromise } from "./index"

afterEach(cleanup)

/**
 * A JELVÉNY ÉS AZ ÍGÉRET-MONDAT KÉT KÜLÖN ELEM, ÉS EZ SZÁNDÉKOS.
 *
 * A jelvény a képen BELÜL áll (abszolút pozícióval), a mondat a kép ALATT. Egy
 * komponensbe téve a mondat a jelvény pozicionálását örökölné, és a képre
 * csúszna. A két állítás azt rögzíti, hogy mindkettő KÜLÖN kirajzolható.
 */
describe("az egyedi példány jelölése", () => {
  it("a jelvény felirata a WYSIWYG-ígéretet jelöli", () => {
    render(<UniquePieceBadge />)
    expect(screen.getByTestId("unique-piece-badge")).toHaveTextContent(
      "Egyedi példány",
    )
  })

  it("az ígéret-mondat kimondja, mit kap a vevő", () => {
    render(<UniquePiecePromise />)
    expect(screen.getByTestId("unique-piece-promise")).toHaveTextContent(
      "ezt kapod, nem egy hasonlót",
    )
  })
})

/**
 * A JELVENY SZINEI A TERVBOL, TOKENEN KERESZTUL.
 *
 * A tervbeli jelveny a 2a lapon REZ hatteren all, SOTET szoveggel. A sotet
 * blokkban a `--terv-kiemel` = oklch(0.62 0.13 45) es a `--terv-kiemel-szoveg`
 * = oklch(0.15 0.014 45) -- pontosan a mert ket ertek.
 *
 * A HATAR: jsdom nem oldja fel a CSS-valtozot, tehat ez a NEVET meri, nem a
 * kiszamolt szint. Amit bizonyit: hogy a jelveny TOKENT ker, es a HELYES
 * szerepu tokent -- nem azt, hogy a kepernyon rez lesz.
 *
 * MIERT KELL RA ALLITAS: a ket ertek EGYUTT mozdul vagy sehogy. Ha valaki csak
 * a hattert allitja vissza beirt szinre, a sotet szoveg olvashatatlan lesz --
 * es ez nem hibauzenettel jelentkezik, hanem a lapon.
 */
describe("a jelvény színei", () => {
  it("a jelvény a felület-tokent viseli háttérként", () => {
    render(<UniquePieceBadge />)

    const jelveny = screen.getByTestId("unique-piece-badge")
    expect(jelveny.style.background).toBe("var(--terv-kiemel)")
  })

  it("a rezen álló szöveg a saját tokenjét viseli", () => {
    render(<UniquePieceBadge />)

    const jelveny = screen.getByTestId("unique-piece-badge")
    expect(jelveny.style.color).toBe("var(--terv-kiemel-szoveg)")
  })

  /**
   * ES A KET BEIRT SZIN NEM JOHET VISSZA. Ez nem ismetles: a fenti ketto a
   * TOKENT rogziti, ez azt, hogy a regi alak ne alljon MELLETTE -- egy
   * ottfelejtett `bg-neutral-900/85` osztaly a stilus fole kerulne vagy ala,
   * es a ketto kozott a sorrend donteneen.
   */
  it("a beírt színek nem állnak az osztályok között", () => {
    render(<UniquePieceBadge />)

    const jelveny = screen.getByTestId("unique-piece-badge")
    expect(jelveny.className).not.toContain("bg-neutral")
    expect(jelveny.className).not.toContain("text-amber")
  })

  /**
   * A FELULET TELJESEN ATLATSZATLAN -- ES EZ DONTES, NEM RESZLET.
   *
   * acrobot dontese (msg 15106, 2. pont): a jelveny TOMOR rez felulet legyen.
   * A regi alak atlatszo sotet fatyol volt, es ket resze volt: a 85 szazalek
   * ES a `backdrop-blur-sm`. Az elsot a #157 elvitte, a masodik ITTMARADT --
   * mert semmi nem allitott rola.
   *
   * ES A REGI ALLITASOK VAKOK VOLTAK RA, ezt megmertem: a blur oraknyi ideig
   * ott allt a fo agon, 322 ZOLD teszt mellett. A ket token-allitas a
   * HATTERSZINT nezi, a fenti sor a BEIRT SZINEKET -- egyik sem lat egy
   * atlatszosagot sugallo effektet.
   *
   * MIERT NEM CSAK A `backdrop-blur`-RA ALLIT: a dontes az ATLATSZATLANSAGROL
   * szol, nem egy osztaly nevrol. Egy `bg-white/50` vagy egy `opacity-*`
   * ugyanugy megszegné, es egy szuk allitas mellettuk zold maradna.
   */
  it("a felület nem visel átlátszóságot sugalló osztályt", () => {
    render(<UniquePieceBadge />)

    const osztalyok = screen.getByTestId("unique-piece-badge").className

    for (const tiltott of ["backdrop-", "opacity-", "/"]) {
      expect(osztalyok).not.toContain(tiltott)
    }
  })
})
