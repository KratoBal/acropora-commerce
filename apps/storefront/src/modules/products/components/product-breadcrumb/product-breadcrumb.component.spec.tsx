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

  it("a lista a halvány szöveg tokenjét viseli", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-lista").style.color).toBe(
      "var(--terv-szoveg-halvany)",
    )
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
