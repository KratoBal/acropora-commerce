import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import StockState, { FO_GOMB_MERET } from "./index"

/**
 * A KIRAJZOLÁS MÉRÉSE -- AZ AZ ÁG, AMI A VEVŐ ELÉ KERÜL.
 *
 * === MIÉRT VAN EGYÁLTALÁN ===
 *
 * A döntést (`availabilityOf`) tíz állítás fedi, de a kirajzolást eddig SEMMI.
 * Épp azt az ágat nem, amiért az egész készült: hogy az "Eladva" állapotban nem
 * letiltott gomb áll, hanem továbbvivő hivatkozás. Egy jelentés, ami kimondja,
 * hogy egy utat semmi nem mér, és mégis kiküldi rajta a funkciót, nem jelentés.
 *
 * === A HAMIS, AMI KELL: a countryCode ===
 *
 * A `LocalizedClientLink` a `useParams`-ból veszi az ország-kódot. Nem a linket
 * cseréljük ki hamisra, hanem a keret hívását: így a MI komponensünk valódi
 * hivatkozást rajzol, és a `href` a maga teljes alakjában mérhető.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

describe("a készlet-állapot kirajzolása", () => {
  it("KAPHATÓ állapotban a kosár-gomb kattintható, és a kattintás továbbmegy", async () => {
    const kosarba = vi.fn()
    render(
      <StockState
        availability="KAPHATO"
        similarHref="/collections/elo-korallok"
        onAddToCart={kosarba}
      />,
    )

    const gomb = screen.getByTestId("add-product-button")
    expect(gomb).not.toBeDisabled()
    expect(gomb).toHaveTextContent("Kosárba")

    gomb.click()
    expect(kosarba).toHaveBeenCalledTimes(1)
  })

  it("ELFOGYOTT állapotban a gomb ott van, de le van tiltva", () => {
    const kosarba = vi.fn()
    render(
      <StockState
        availability="ELFOGYOTT"
        similarHref="/collections/elo-korallok"
        onAddToCart={kosarba}
      />,
    )

    const gomb = screen.getByTestId("add-product-button")
    expect(gomb).toBeDisabled()
    expect(gomb).toHaveTextContent("Nincs raktáron")
  })

  /**
   * A REZ A FO CSELEKVESEN -- ES A HAROM ALLITAS EGYUTT MER, KULON-KULON NEM.
   *
   * A tervbol merve (playwright, a tervlap megrenderelve): a "Kosárba" gomb
   * hattere `oklch(0.62 0.13 45)`, vagyis a `--terv-kiemel`. Ugyanabbol a
   * meresbol: a "Köteg kosárba" NEM rez, es a tovabbvivo gomb sem az.
   *
   * Ha csak az elso allitas allna itt, egy olyan valtozas, ami MINDEN gombot
   * rezre fest, ugyanugy zold maradna -- es akkor a rez nem jelolne semmit.
   * Ezert all mellette a ket TILTO eset, nev szerint.
   */
  /**
   * A FO CSELEKVES MINDKET VILAGBAN a `--terv-kiemel` erteket viseli
   * (vilagoson 0.55, soteten 0.62) -- merve a tervlap harom lapjan,
   * szakaszonkent, nulla kivetellel. Egy valtozo, ket blokk, ket ertek.
   *
   * ITT KORABBAN AZ ALLT, hogy a helyes nev a hosszabbik
   * (`--terv-kiemel-sotet`), es hogy aki "kijavitja" a rovidebbre, a tervtol
   * tavolodik. Az akkor igaz volt, ma az ELLENKEZOJE: a ket rez-valtozo
   * 2026-09-08-tol egy, mert a masodikra sehol nem volt meresunk, es a rovid
   * nev az egyetlen. A figyelmeztetest nem torlom, mert a szam (0.55/0.62)
   * valtozatlan -- csak a nev mozdult, es epp ez az, amit egy fel-emlekezet
   * rosszul potolna.
   */
  it("a kapható kosár-gomb rezet visel", () => {
    render(
      <StockState
        availability="KAPHATO"
        similarHref="/collections/elo-korallok"
        onAddToCart={vi.fn()}
      />,
    )
    expect(screen.getByTestId("add-product-button")).toHaveStyle({
      background: "var(--terv-kiemel)",
    })
  })

  /**
   * KULON TESZT, ES NEM TAGOLASI IZLES: ket FUGGETLENUL RONTHATO allitas van
   * (a rez megleteten es a hatokoren), es egy tesztben a futtato csak a TESZT
   * nevet irja ki. Egy fajlban merve: a rez elvetele az elsot dontotte pirosra,
   * a hatokor kinyitasa (rez a letiltott gombra is) a masodikat -- es
   * mindketto zolden hagyta a masikat.
   */
  it("a letiltott és a továbbvivő gomb NEM visel rezet", () => {
    const { unmount } = render(
      <StockState
        availability="ELFOGYOTT"
        similarHref="/collections/elo-korallok"
        onAddToCart={vi.fn()}
      />,
    )
    expect(
      screen.getByTestId("add-product-button").getAttribute("style"),
    ).toBeNull()
    unmount()

    render(
      <StockState
        availability="ELADVA"
        similarHref="/collections/elo-korallok"
        onAddToCart={vi.fn()}
      />,
    )
    expect(
      screen.getByText("Hasonló példányok megnézése").getAttribute("style"),
    ).toBeNull()
  })

  /**
   * A LÉNYEG: NEM LETILTOTT GOMB, HANEM MÁSIK GOMB.
   *
   * Két állítás, mert az egyik önmagában kevés. Hogy a hivatkozás OTT VAN, azt
   * egy olyan doboz is teljesítené, ami MELLÉ teszi a letiltott kosár-gombot --
   * és pont az a zsákutca, amit el akartunk kerülni. Ezért áll mellette a
   * hiányt mérő állítás is.
   */
  it("ELADVA állapotban továbbvivő hivatkozás áll, NEM kosár-gomb", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/collections/elo-korallok"
        onAddToCart={() => undefined}
      />,
    )

    const link = screen.getByRole("link", {
      name: /Hasonló példányok megnézése/,
    })
    expect(link).toHaveAttribute("href", "/hu/collections/elo-korallok")

    expect(screen.queryByTestId("add-product-button")).toBeNull()
    expect(screen.getByText("Nem elérhető")).toBeTruthy()
  })

  /**
   * AZ ELADVA MAGYARÁZATA A DOBOZBAN VAN, NEM A LAPON.
   *
   * A puszta "Eladva" nem mondja meg, hogy ez VÉGLEGES: enélkül a vevő ugyanúgy
   * visszatérhet holnap, mint egy elfogyott terméknél, és hiába.
   */
  it("ELADVA állapotban ott áll a magyarázat is", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/store"
        onAddToCart={() => undefined}
      />,
    )

    expect(screen.getByText(/Egyedi példány, nem pótolható/)).toBeTruthy()
  })

  /**
   * A KÉT KIRAJZOLÁSI HELY NEM ÜTKÖZIK.
   *
   * A lap a gomb-oszlopban ÉS a lebegő mobil sávon is kirajzolja ezt a dobozt.
   * Ha mind a kettő ugyanazt az azonosítót viselné, a végponti keresés
   * kétértelmű lenne -- és az a hiba csendes: a teszt az elsőt találná meg.
   */
  /**
   * AZ ELADVA AG KET SZOVEGE TOKENEN ALL, ES EZ EDDIG MERETLEN VOLT.
   *
   * A token-fedettseg merese (2026-09-08) huszonharom olyan style-node-ot
   * talalt a kirakatban, amire SEMMILYEN allitas nem mutat -- ez ketto volt
   * kozuluk. Nem azert maradtak ki, mert valaki elfelejtette: nem volt
   * azonositojuk, tehat egy allitas csak a SZOVEGRE tudott volna hivatkozni.
   *
   * A KETTO KULON ALL, mert kulon romolhat el: a cimke a fo szoveg-szint
   * (`--terv-szoveg`), a magyarazat a masodlagos (`--terv-szoveg-halvany`).
   * Egy allitas, ami csak az egyiket nezi, a masik elcsuszasat nem latna.
   */
  it("az ELADVA címke és a magyarázat külön szöveg-tokenen áll", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/collections/elo-korallok"
        onAddToCart={vi.fn()}
      />,
    )

    expect(screen.getByTestId("add-product-button-eladva-cimke")).toHaveStyle({
      color: "var(--terv-szoveg)",
    })
    expect(
      screen.getByTestId("add-product-button-eladva-magyarazat"),
    ).toHaveStyle({ color: "var(--terv-szoveg-halvany)" })
  })

  it("a testId paraméter az ELADVA ágon is végigmegy", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/store"
        onAddToCart={() => undefined}
        testId="mobile-cart-button"
      />,
    )

    expect(screen.getByTestId("mobile-cart-button-eladva")).toBeTruthy()
  })
})

/**
 * A FO CSELEKVES MERETE -- KET ALLITAS, ES KULON-KULON MAST FOGNAK MEG.
 *
 * A kettot nem lehet osszevonni, mert KET FUGGETLEN modon romolhat el:
 *
 *   a gomb elveszti az osztalyt  -> az elso pirosodik
 *   az ertek megvaltozik (54->44) -> a masodik pirosodik
 *
 * Ha csak az elso allna itt, egy `h-[44px]`-re irt konstanssal is zold
 * maradna: a gomb tovabbra is "a konstansot viseli". Ha csak a masodik,
 * akkor a konstans helyes erteken allna, mikozben senki nem hasznalja.
 *
 * === AMIT EZ AZ ALLITAS NEM GARANTAL, ES KI KELL MONDANI ===
 *
 * Azt meri, hogy a gomb VISELI a jelolest, nem azt, hogy a bongeszo 54
 * pixelt RAJZOL. A jsdom nem forditja le a Tailwind osztalyokat. Egy elirt
 * osztalynev (`h-[54pxx]`) ezen atmenne, es csak a lapon latszana.
 */
describe("a fő cselekvés mérete a tervből", () => {
  it("a kosár-gomb viseli a panel mért méretét", () => {
    render(
      <StockState
        availability="KAPHATO"
        similarHref="/collections/elo-korallok"
        onAddToCart={vi.fn()}
      />,
    )

    const gomb = screen.getByTestId("add-product-button")
    for (const jeloles of FO_GOMB_MERET.split(" ")) {
      expect(gomb.className).toContain(jeloles)
    }
  })

  /**
   * A SZAM ITT LITERALKENT ALL, SZANDEKOSAN. Ha a konstansbol olvasnam ki,
   * az allitas onmagat igazolna vissza, es barmilyen ertekre zold maradna.
   */
  it("a mért érték 54 pixel, 16 pixeles félkövér felirattal", () => {
    expect(FO_GOMB_MERET).toContain("h-[54px]")
    expect(FO_GOMB_MERET).toContain("text-base")
    expect(FO_GOMB_MERET).toContain("font-semibold")
  })
})
