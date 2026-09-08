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

/**
 * A SAV TONUSA, ES AMIERT EZ AZ ALLITAS UTOLAG SZULETETT.
 *
 * A sav hatteret eddig SEMMI nem merte. Ez onmagaban is eleg ok lenne, de a
 * konkret kiváltó ok rosszabb: a sav fejleceben egy HAMIS mondat allt (a
 * tervbeli erteket 0.17-nek nevezte), es arra epult egy jelentes es egy dontes,
 * mielott barki visszamerte volna.
 *
 * A TERV NYERS FORRASABOL MERVE (2026-09-08): a sav a sotet lapon
 * `background:oklch(0.205 0.018 249)` erteket visel, `border-top` mellett --
 * ugyanazt, mint a panelek, es VILAGOSABBAT a lapnal (0.17).
 *
 * AMIT MER: a token NEVET. Az erteket a `terv-tokenek.spec.ts` allitja.
 */
describe("a ragadós sáv tónusa", () => {
  /**
   * A SAV A LAP TOKENJET VISELI, ES EZ EGY VISSZAVONAS VISSZAVONASA.
   *
   * Ez az allitas eloszor `--terv-hatter-halvany` erteket kert (a #214-ben),
   * hibas meresre epitve: a savot a MERETE es a MARGOJA alapjan kerestem a
   * tervben, nem a sajat megkulonbozteto jegye (`position:sticky; bottom:0`)
   * alapjan -- es egy MASIK savot talaltam meg.
   *
   * A terv sticky save mind a harom lapon a SAJAT LAPJANAK a hatteret viseli:
   * sotetben 0.17, vilagosban 0.99 -- vagyis pontosan a `--terv-hatter`, mind a
   * ket vilagban betuere.
   *
   * A NEVE IS SZUKEBB LETT. Az elozo alak ("a panelek tokenjét viseli, nem a
   * lapét") KET dolgot allitott egy nevben, es a masodik fele volt a hamis.
   * Ez most egyet allit: azt, amit mer.
   */
  it("a sáv a lap tokenjét viseli", () => {
    render(<RagadosSav ar={<span>289 900 Ft</span>} />)

    const sav = screen.getByTestId("ragados-sav")

    expect(sav.style.background).toBe("var(--terv-hatter)")
  })

  /*
    ITT ALLT EGY MASODIK ALLITAS ("a sav tokenje NEM a lap tokenje"), ES
    KIVETTEM, MIELOTT BEKULDTEM VOLNA.

    A kalibracion vegiggondolva nincs olyan rontas, amitol az pirosodna a
    fenti nelkul: barmi, ami a lap tokenjere allitja a savot, MAR a fenti
    allitast is elviszi. Vagyis nem egy masodik meres volt, hanem ugyanaz
    masodszor -- es egy allitas, ami sosem sul el egyedul, nem noveli a
    vedelmet, csak a szamot.

    Ami TENYLEG hianyzott: hogy a ket token ERTEKE kulonbozik-e. Ha valaki a
    stiluslapon egyenlove tenne oket, mind a ket komponens-allitas zold
    maradna, es a savot megsem lehetne latni a lapon. Az az allitas a
    `terv-tokenek.spec.ts`-ben all, mert ott van az ertek.
  */
})

/**
 * A SAV GEOMETRIAJA -- ES AMIERT EPP EZ AZ ELEM KAPTA ELOSZOR.
 *
 * Merve (2026-09-08): a kirakatban a terv-eredetu geometriai ertekek 15
 * szazalekara all allitas, a szin-tokenek 72 szazalekara. A meret tehat
 * nagysagrenddel kevesbe vedett -- es epp az romlik nemán, mert egy elcsuszott
 * pixel nem hibazik, csak maskepp nez ki.
 *
 * ES EZ AZ ELEM A LEGJOBB ELSO FALAT, mert ma KETSZER mertem el:
 * eloszor MERET alapjan kerestem meg a tervben (es egy masik savot talaltam),
 * aztan a szakaszhataron KIVUL alltam neki keresni. A geometriaja a tervbol
 * van, a komponens fejleceben le is van irva -- es eddig egyetlen allitas sem
 * allt rajta.
 *
 * A MERT ERTEKEK, mind a harom tervlapon azonosak:
 *
 *     belso margo   14px 18px
 *     koz           10px
 *
 * AMIT NEM MER: a festett pixelt. A jsdom nem forditja le a Tailwind
 * osztalyokat; ez a JELOLES meglétét meri.
 */
describe("a sáv geometriája a tervből", () => {
  const sav = () => {
    render(<RagadosSav ar="24 900 Ft" />)
    return screen.getByTestId("ragados-sav")
  }

  it("a keskeny nézet belső margója a tervből", () => {
    const cs = sav().className
    expect(cs).toContain("px-[18px]")
    expect(cs).toContain("py-[14px]")
  })

  it("a közök a tervbeli tíz pixel", () => {
    expect(sav().className).toContain("gap-[10px]")
  })

  /**
   * A SZELES NEZET KULON ALLITAS, ES NEM RESZLETEZES.
   *
   * A ket ertek EGY osztaly-lancban all egymas mellett, tehat egy allitassal
   * "lefedheto" lenne mind a ketto -- de akkor a kettot egyutt lehetne
   * elrontani. A tervben a szeles nezet SAJAT erteket kap (20px 44px), es ez
   * fuggetlen dontes a keskenytol.
   */
  it("a széles nézet saját margót és közt kap", () => {
    const cs = sav().className
    expect(cs).toContain("lg:px-11")
    expect(cs).toContain("lg:py-5")
    expect(cs).toContain("lg:gap-5")
  })
})
