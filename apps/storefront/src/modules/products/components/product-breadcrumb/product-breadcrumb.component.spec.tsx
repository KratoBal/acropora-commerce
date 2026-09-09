import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * A DUPLA ATADJA A `className`-t ES A `href`-et -- ES EZ NEM RESZLET.
 *
 * Az eredeti dupla CSAK a gyerekeket adta tovabb, a tobbi tulajdonsagot
 * eldobta. Ettol a link-elemek osztalya a renderelt fabana URES lett, es ennek
 * ket kovetkezmenye volt:
 *
 *   1. egy lebegtetesre irt allitas a DUPLAT merte volna, nem a komponenst;
 *   2. es a lenti "egyetlen rogzitett szin-osztaly sem maradt" allitas VAK
 *      volt a linkekre -- ha valaki visszatenne rajuk a `text-ui-fg-base`
 *      osztalyt, az allitas ZOLD maradna, mert az az osztaly a dupla miatt
 *      sosem kerult a kimenetbe.
 *
 * Vagyis a dupla nem csak egy allitast gyengitett, hanem egy MEGLEVO vedelmet
 * is: pontosan az az alak, amit a jegyzeteink ugy hivnak, hogy a hivo hasznal
 * egy erteket, amit a teszt nem allit.
 */
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode
    className?: string
    href?: string
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}))

import ProductBreadcrumb from "./index"

afterEach(cleanup)

/**
 * A TERMEK MOSTANTOL HORDOZ KATEGORIAT, ES EZ NEM KOZMETIKA.
 *
 * A "Fooldal" elem kikerult (a tervlapon nem szerepel), tehat a listaban CSAK
 * a kategoria-linkek maradnak. A regi fixtura nem adott a TERMEKNEK kategoriat,
 * tehat nulla link keletkezett -- es a lebegtetes-allitas ezt azonnal
 * megfogta. Helyes piros volt: az allitas eddig a "Fooldal" linken allt, nem
 * azon, amirol szol.
 */
const termek = {
  id: "p1",
  title: "Acropora tenuis",
  categories: [{ id: "c1" }],
  variants: [{ sku: "A-1042" }],
} as never
const kategoriak = [
  { id: "c1", name: "Korallok", handle: "korallok", parent_category_id: null },
] as never

/**
 * EGY KETSZINTU FIXTURA, A BOLT VALODI NEVADASAVAL.
 *
 * A `kategoriak` fenti alakja egyetlen GYOKERBOL all, tehat nincs benne
 * szulo-utotag -- es epp ezert nem tudott merni semmit arrol, hogy a
 * morzsamenu a TELJES vagy a ROVID nevet mutatja-e. Merve 2026-09-09: a
 * `teljesNev` mezot `nev`-re cserelve NULLA allitas fordult pirosra.
 *
 * A bolt neveiben a szulo neve ott all (`NEV - SZULONEV`, a menu 92
 * gyermek-nevebol 92). A morzsamenu SZANDEKOSAN a teljes nevet mutatja: ott az
 * UT szamit. A cim folotti besorolas-sor a rovidet mutatja. Hogy a ketto
 * kozeledjen-e, kulon tetel (acrobot, 2026-09-09).
 */
const termek_ketszintu = {
  id: "p2",
  title: "Acropora tenuis",
  categories: [{ id: "c3" }],
  variants: [{ sku: "A-1042" }],
} as never
const kategoriak_ketszintu = [
  { id: "c1", name: "Korallok", handle: "korallok", parent_category_id: null },
  {
    id: "c3",
    name: "SPS - Korallok",
    handle: "sps",
    parent_category_id: "c1",
  },
] as never

/**
 * A MORZSAMENU SZINEI TOKENBOL JONNEK (a sotet lap 4. pontja).
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A jsdom nem oldja fel a CSS-valtozokat, tehat itt a token NEVE merheto, nem
 * a festett szin. Amit bizonyit: a morzsamenu nem visel ROGZITETT szint, tehat
 * egy sotet feluletre athelyezve sem lesz olvashatatlan.
 *
 * AMIT NEM: hogy a morzsamenu MA a sotet feluleten all -- ma nem all ott, es az
 * athelyezes kulon lepes. Ez a valtozas a FELTETELE annak, nem a megvalositasa.
 */
describe("a morzsamenü színei", () => {
  /** ISMERT POZITIV KONTROLL: a morzsamenu megrajzolodik. */
  it("a morzsamenü megjelenik, a jelenlegi lappal együtt", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-lista")).toBeTruthy()
    expect(screen.getByTestId("morzsamenu-jelenlegi")).toBeTruthy()
  })

  /**
   * AZ UTVONAL SAJAT TOKENJET VISELI, NEM A HALVANY SZOVEGET.
   *
   * Ez az allitas 2026-09-09-ig a `--terv-szoveg-halvany` tokenre szolt, es
   * HELYES volt akkor. A terv viszont mind a ket lapon MASKEPP allitja be a
   * kettot, es KULONBOZO iranyba:
   *
   *     lap   utvonal-sor              halvany szoveg
   *     2a    oklch(0.66 0.014 250)    oklch(0.72 0.012 250)
   *     1b    oklch(0.52 0.012 60)     oklch(0.5 0.012 60)
   *
   * A TAGADAS AZERT KELL, mert a ket token ERTEKE kozel all egymashoz: ha
   * valaki visszairja a regit, a lap alig valtozik, es csak ez az allitas
   * szolna.
   */
  it("a lista az útvonal tokenjét viseli", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    const stilus = screen.getByTestId("morzsamenu-lista").getAttribute("style")

    expect(stilus).toContain("var(--terv-utvonal)")
    expect(stilus).not.toContain("var(--terv-szoveg-halvany)")
  })

  it("a jelenlegi lap a szöveg tokenjét viseli", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-jelenlegi").style.color).toBe(
      "var(--terv-szoveg)",
    )
  })

  /**
   * A HIANY-ALLITAS, AMI A LENYEG: egyetlen ROGZITETT szin sem maradhat, mert
   * pontosan azok tunnenek el egy sotet feluleten. A fenti ket allitas a
   * pozitiv fele; ez a negativ.
   */
  it("egyetlen rögzített szín-osztály sem maradt", () => {
    const { container } = render(
      <ProductBreadcrumb product={termek} categories={kategoriak} />,
    )

    expect(container.innerHTML).not.toContain("text-ui-fg-base")
    expect(container.innerHTML).not.toContain("text-ui-fg-muted")
  })
})

/**
 * A LEBEGTETES SZINE -- KET ALLITAS, ES A MASODIK A KONTROLL.
 *
 * A dontes (acrobot, msg 15614): a link a lista szinet orokli, a lebegtetes a
 * `--terv-szoveg` tokent kapja. Ugyanaz a token, amit a sor VEGE visel, tehat
 * a lebegtetes a listat arra a szintre hozza fel, amin a mai termek all.
 *
 * A MASODIK ALLITAS NEM DISZ: a mai termek eleme MAR ezen a szinen all, es NEM
 * link. Ha a jeloles ravandorolna, az egy nem letezo lebegtetett allapotot
 * igerne egy nem kattinthato elemen -- es az elso allitas ettol meg zold
 * maradna.
 *
 * AMIT NEM MER: a festett szint. A jsdom nem forditja le a Tailwind
 * osztalyokat; ez a jeloles MEGLETET meri.
 */
describe("a lebegtetés színe", () => {
  it("a morzsamenü linkjei lebegtetéskor az erősebb tokent kapják", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    /*
      `Array.from`, nem kozvetlen bejaras: a `NodeListOf` bejarasa a repo
      forditasi celjan TS2802-t ad (`--downlevelIteration` nelkul). A teszt
      ettol meg ZOLDEN futott -- epp ezert kell a ket kaput kulon nezni.
    */
    const linkek = Array.from(
      screen.getByTestId("morzsamenu-lista").querySelectorAll("a"),
    )

    expect(linkek.length).toBeGreaterThan(0)
    for (const link of linkek) {
      expect(link.className).toContain("hover:text-terv-szoveg")
    }
  })

  it("a mai termék eleme NEM kapja meg, mert nem link", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-jelenlegi").className).not.toContain(
      "hover:text-terv-szoveg",
    )
  })
})

/**
 * A TERVLAP ALAKJA: `KORALLOK / WYSIWYG / SPS / A-1042`.
 *
 * Harom elteres a korabbi alaktol, es mind a harom a tervbol jon:
 * nincs "Fooldal", a sor NAGYBETUS es allo szelessegu betut visel, es az
 * utolso elem a CIKKSZAM, nem a termek neve.
 */
describe("a morzsamenü a tervlap alakját veszi fel", () => {
  it("nincs Főoldal elem", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-lista").textContent).not.toContain(
      "Főoldal",
    )
  })

  /** POZITIV KONTROLL a fentihez: a kategoria-link viszont OTT van. */
  /**
   * A MORZSAMENU A TELJES NEVET MUTATJA, A SZULO UTOTAGJAVAL EGYUTT.
   *
   * A cim folotti besorolas-sor ugyanabbol a levezetesbol dolgozik, de a ROVID
   * nevet veszi. A ket alak egy MEZO kulonbsege, nem ket szamitas -- es hogy
   * itt a teljes all, az DONTES: a morzsamenuben az UT szamit.
   *
   * Enelkul az allitas nelkul a ket mezo felcserelheto lenne csendben: merve
   * 2026-09-09, a csere NULLA pirosat adott.
   */
  /**
   * A SOR NEM ELVALASZTOVAL KEZDODIK.
   *
   * A tervben a jel a tagok KOZE kerul (`KORALLOK / WYSIWYG / SPS / A-1042`),
   * nalunk minden `li` a sajat jelevel kezdodott, tehat a sor egy felesleges
   * karakterrel indult. Merve a kitelepitett lapon 2026-09-09:
   * `/ KORALLOK / WYSIWYG - KORALLOK / ...`.
   *
   * AZ ALLITAS AZ ELSO KARAKTERRE MER, nem a jelek SZAMARA: egy szam-allitas
   * akkor is teljesulne, ha a jel az elso elem ele es a masodik moge kerulne.
   */
  it("a sor nem elválasztóval kezdődik", () => {
    render(
      <ProductBreadcrumb
        product={termek_ketszintu}
        categories={kategoriak_ketszintu}
      />,
    )

    const szoveg = screen.getByTestId("morzsamenu-lista").textContent ?? ""

    expect(szoveg.trim().startsWith("/")).toBe(false)

    /* ISMERT POZITIV KONTROLL: a jel LETEZIK a sorban, csak nem az elejen.
       Enelkul a fenti allitas egy jel nelkuli sort is elfogadna. */
    expect(szoveg).toContain("/")
  })

  /**
   * ES KATEGORIA NELKUL SEM: ott a jelenlegi elem az ELSO, tehat ele sem kerul
   * jel. Ez az az ag, amit a fenti allitas nem er el.
   */
  it("kategória nélkül sem kezdődik elválasztóval", () => {
    const kategoria_nelkul = {
      id: "p3",
      title: "Acropora tenuis",
      categories: [],
      variants: [{ sku: "A-1042" }],
    } as never

    render(
      <ProductBreadcrumb product={kategoria_nelkul} categories={[] as never} />,
    )

    const szoveg = screen.getByTestId("morzsamenu-lista").textContent ?? ""

    expect(szoveg.trim().startsWith("/")).toBe(false)
    expect(szoveg).toContain("A-1042")
  })

  /**
   * A MERET, A BETUKOZ ES A KOZ A TERVBOL JON.
   *
   *     font-size:11px   letter-spacing:0.08em   gap:9px
   *
   * Ugyanez a ket valasztott lapon (2a es 1b), beture azonos deklaracioval.
   * Korabban `text-sm` (14 px) allt, betukoz nelkul, `gap-2` (8 px) kozzel.
   *
   * A jsdom nem szamol elrendezest, tehat ez a kirajzolt OSZTALYT meri, nem a
   * festett meretet.
   */
  /**
   * HAROM ERTEK, HAROM NEV -- ES EZT A SAJAT SZABALYUNK KENYSZERITI KI.
   *
   * Ez az allitas 2026-09-09-ig egy `it()`-ben orizte a meretet, a betukozt es
   * a kozt. A kalibracioban a meret es a betukoz rontasa UGYANAZT a piros
   * NEVET adta -- vagyis a nev nem mondta meg, MELYIK ertek mozdult.
   *
   * Ugyanaznap ket masik helyen (a cim merete, a vaz terkozei) mar
   * szetbontottam oket, ITT viszont nem vettem eszre. A szabalyt a sajat
   * munkamra alkalmazva talaltam meg. (acrobot, uzenet 16891: "ha egy allitas
   * TOBB FUGGETLEN erteket orz, akkor annyi NEVET is kap".)
   *
   * A negyedik `expect` (a tagadas a regi `text-sm`-re) a MERET allitasahoz
   * tartozik, mert ugyanarrol az ertekrol szol -- ket meret egymas mellett a
   * keret sorrendjere bizna a dontest.
   */
  const morzsaOsztaly = () => {
    render(
      <ProductBreadcrumb
        product={termek_ketszintu}
        categories={kategoriak_ketszintu}
      />,
    )

    return screen.getByTestId("morzsamenu-lista").className
  }

  it("a sor a terv 11 pixeles betűméretét viseli", () => {
    const osztaly = morzsaOsztaly()

    expect(osztaly).toContain("text-[11px]")
    expect(osztaly).not.toContain("text-sm")
  })

  it("a sor a terv 0.08em betűközét viseli", () => {
    expect(morzsaOsztaly()).toContain("tracking-[0.08em]")
  })

  it("a sor a terv 9 pixeles közét viseli", () => {
    expect(morzsaOsztaly()).toContain("gap-[9px]")
  })

  it("a teljes nevet mutatja, a szülő utótagjával", () => {
    render(
      <ProductBreadcrumb
        product={termek_ketszintu}
        categories={kategoriak_ketszintu}
      />,
    )

    const szoveg = screen.getByTestId("morzsamenu-lista").textContent

    expect(szoveg).toContain("SPS - Korallok")
  })

  it("a kategória továbbra is ott áll, linkként", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    const linkek = Array.from(
      screen.getByTestId("morzsamenu-lista").querySelectorAll("a"),
    )

    expect(linkek.map((l) => l.textContent)).toEqual(["Korallok"])
  })

  it("az utolsó elem a cikkszám, nem a termék neve", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    const jelenlegi = screen.getByTestId("morzsamenu-jelenlegi")

    expect(jelenlegi.textContent).toContain("A-1042")
    expect(jelenlegi.textContent).not.toContain("Acropora tenuis")
  })

  /**
   * ES A TARTALEK, MERT NEM MINDEN VALTOZATON ALL CIKKSZAM. Egy URES utolso
   * elem rosszabb lenne a hosszu nevnel: a latogato nem latna, hol all.
   */
  it("cikkszám nélkül a név marad", () => {
    const sku_nelkul = {
      id: "p1",
      title: "Acropora tenuis",
      categories: [{ id: "c1" }],
    } as never

    render(<ProductBreadcrumb product={sku_nelkul} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-jelenlegi").textContent).toContain(
      "Acropora tenuis",
    )
  })

  /**
   * A NAGYBETUS ALAK CSS-BEN VAN, NEM AZ ADATBAN. Egy `toUpperCase()` a
   * szovegen a magyar ekezetes betuket is atirna, es a masolt szoveg is
   * nagybetus lenne.
   */
  it("a nagybetűs alak CSS-ből jön, az adat változatlan", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    const lista = screen.getByTestId("morzsamenu-lista")

    expect(lista.className).toContain("uppercase")
    expect(lista.textContent).toContain("Korallok")
  })
})
