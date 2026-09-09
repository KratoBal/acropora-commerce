import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ProductPrice from "./index"

afterEach(cleanup)

const arral = (osszeg: number) => ({
  calculated_price: {
    calculated_amount: osszeg,
    original_amount: osszeg,
    currency_code: "huf",
    calculated_price: { price_list_type: null },
  },
})

const termek = (valtozatok: number) =>
  ({
    id: "prod_1",
    variants: Array.from({ length: valtozatok }, (_, i) => ({
      id: `v${i + 1}`,
      ...arral(319000 + i * 1000),
    })),
  }) as never

describe("a termék ára", () => {
  /**
   * A "-TOL" ALAK KET FELTETELHEZ KOTOTT, ES A MASODIK AZ, AMI EDDIG HIANYZOTT.
   *
   * A regi alak (`!variant && "From "`) csak azt nezte, kaptunk-e valtozatot --
   * nem azt, hogy VAN-E TOBB. Merve az elo lapon (2026-09-07): a muszaki
   * termeklapon "From 319 000 Ft" jelent meg egy EGYVALTOZATOS termeken.
   *
   * A katalogusban 1884 terméknek nincs valtozata es 9-nek van, tehat a regi
   * alak a termekek tulnyomo tobbsegen allitott valotlant.
   */
  /**
   * A KIRAJZOLT AR-SZOVEGBEN NINCS TIZEDES.
   *
   * Ez a `money.spec.ts` allitasanak a MASIK VEGE: ott a fuggveny kimenetet
   * merjuk, itt azt, hogy a lapra KIRAJZOLT szoveg is ilyen. A ketto kozott
   * ott a komponens, ami sajat szoveget is fuz hozza ("-tol"), tehat kulon
   * elromolhat.
   *
   * Balazs kerese (2026-09-09, kepernyokeppel): `151 990,00 Ft` helyett
   * `151 990 Ft`. Visszamerve a kitelepitett lapon ugyanarra a termekre a
   * tizedes MAR nem volt ott -- a kep a javitas elotti allapotot mutatta.
   * Ez az allitas azt orzi, hogy ne kerulhessen vissza.
   */
  it("a kirajzolt árban nincs tizedes", () => {
    render(<ProductPrice product={termek(1)} />)

    const szoveg = screen.getByTestId("product-price").textContent ?? ""

    /* ISMERT POZITIV KONTROLL: tenyleg az arat olvastuk ki. */
    expect(szoveg).toMatch(/319/)

    expect(szoveg).not.toMatch(/,\d/)
  })

  it("egyetlen változatnál NINCS -tól alak", () => {
    render(<ProductPrice product={termek(1)} />)

    expect(screen.queryByTestId("product-price-tol")).toBeNull()
    expect(screen.getByTestId("product-price")).toBeTruthy()
  })

  it("több változatnál VAN -tól alak", () => {
    render(<ProductPrice product={termek(3)} />)

    expect(screen.getByTestId("product-price-tol").textContent).toBe("-tól")
  })

  /**
   * ES HA A HIVO ATADJA A VALTOZATOT, akkor a konkret arat mutatjuk, tehat a
   * "-tol" ott sem all -- barmennyi valtozat letezik.
   */
  it("átadott változatnál sincs -tól alak", () => {
    const t = termek(3) as unknown as { variants: { id: string }[] }

    render(
      <ProductPrice product={termek(3)} variant={t.variants[1] as never} />,
    )

    expect(screen.queryByTestId("product-price-tol")).toBeNull()
  })

  /**
   * ES A LENYEG, AMIERT EZ A KESZLET LETEZIK: a felirat MAGYAR.
   *
   * Az angol "From" a lapon LATSZOTT, nem allvanyzatban allt. Ez az allitas
   * akkor is pirosodik, ha valaki visszateszi -- barmelyik agon.
   */
  it("sehol nem jelenik meg angol felirat az ár mellett", () => {
    const { container } = render(<ProductPrice product={termek(3)} />)

    expect(container.textContent).not.toContain("From")
    expect(container.textContent).toContain("-tól")
  })
})

/**
 * AZ AR-HELYKITOLTO SZINE -- ES MIERT KELL RA ALLITAS.
 *
 * A helykitolto akkor all elo, ha nincs szamolt ar. Ket helyen renderelodik,
 * es MIND A KETTO megjelenik a sotet lapon is: a vaz ardoboza
 * (`vasarlas/dobozok.tsx`) es a ragados sav (`templates/index.tsx`). Beirt
 * `bg-gray-100` allt rajta, vagyis egy vilagosszurke tomb a sotet lapon.
 *
 * A KET ALLITAS EGYUTT ER VALAMIT, KULON EGYIK SEM:
 *
 * Az elso azt meri, hogy a helykitolto AG EGYALTALAN ELOALL. Enelkul a
 * masodik allitas akkor is zold lenne, ha soha semmi nem renderelodne --
 * egy hianyt mero allitast egy URES VILAG is kielegit.
 *
 * A masodik a tokent meri. Nem a beirt osztaly hianyat: azt egy ures
 * elem is teljesitene.
 */
describe("az ár helykitöltője", () => {
  /** ISMERT POZITIV KONTROLL: valtozat nelkul tenyleg a helykitolto jon. */
  it("változat nélkül a helykitöltő jelenik meg, ár helyett", () => {
    render(<ProductPrice product={termek(0)} />)

    expect(screen.getByTestId("product-price-helykitolto")).toBeTruthy()
    expect(screen.queryByTestId("product-price-tol")).toBeNull()
  })

  it("az ár-helykitöltő a halvány felület tokenjét viseli", () => {
    render(<ProductPrice product={termek(0)} />)
    const elem = screen.getByTestId("product-price-helykitolto")

    expect(elem.style.background).toBe("var(--terv-hatter-halvany)")
    expect(elem.className).not.toContain("bg-gray-")
  })
})

/**
 * AZ AR SZINE A SOTET LAPON (415f455c, 2026-09-08).
 *
 * A HATARA, KIMONDVA: a jsdom nem oldja fel a CSS-valtozokat, tehat ez a
 * TOKEN NEVET meri, nem a festett szint. Amit bizonyit: az ar nem visel
 * rogzitett szint. Amit nem: hogy a token erteke helyes -- azt a
 * `terv-tokenek.spec.ts` mondja meg, vilagonkent nevesitett parral.
 *
 * A KETTO EGYUTT fedi le a lancot, kulon-kulon egyik sem: egy helyes token
 * rossz nevvel ugyanugy olvashatatlan, mint egy rossz erteku token.
 */
describe("az ár színe", () => {
  /** ISMERT POZITIV KONTROLL: a doboz tenyleg megjelenik, es ar all benne. */
  it("az ár doboza megjelenik, és tartalmazza az árat", () => {
    render(<ProductPrice product={termek(1)} />)

    expect(screen.getByTestId("product-price-doboz")).toBeTruthy()
    expect(screen.getByTestId("product-price")).toBeTruthy()
  })

  /**
   * A MERT HIBA: itt `text-ui-fg-base` allt, ami ROGZITETT rgb(24, 24, 27),
   * es a sotet lapon sotet szoveg lett belole sotet feluleten.
   *
   * A HIANY-ALLITAS ONMAGABAN GYENGE (egy ures className is kielegitene),
   * ezert all mellette a token NEVERE szolo pozitiv allitas.
   */
  it("az ár a szöveg tokenjét viseli, nem rögzített színt", () => {
    render(<ProductPrice product={termek(1)} />)
    const doboz = screen.getByTestId("product-price-doboz")

    expect(doboz.style.color).toBe("var(--terv-szoveg)")
    expect(doboz.className).not.toContain("text-ui-fg-")
  })
})

/**
 * AZ AKCIOS AG -- AMIT EDDIG EGYETLEN ALLITAS SEM LATOTT.
 *
 * === MIERT KELL EZ A FIXTURA, ES MIT LEPLEZETT LE ===
 *
 * A keszlet eddig CSAK nem-akcios termeket renderelt, tehat a `price_type ===
 * "sale"` ag soha nem futott le. Ket dolog bujt meg emiatt:
 *
 *   egy ROGZITETT szin (`text-ui-fg-interactive`) az aron es a szazalekon,
 *     ami ugyanugy nem ismeri a vilag-kapcsolot, mint a mellette allo
 *     `text-ui-fg-base` (415f455c)
 *   egy ANGOL felirat ("Original: ") a magyar lapon
 *
 * A masodik a tanulsagosabb. A keszletben AZ ELSO PILLANATTOL allt egy allitas
 * azzal a cimmel, hogy "sehol nem jelenik meg angol felirat az ar mellett" --
 * es igaz is volt, csak a SAJAT HATOKOREN belul: egy nem-akcios terméket
 * renderelt. Az allitas szovege az egesz komponensrol beszelt, a merese egy
 * agrol.
 *
 * Ez ugyanaz az alak, mint amikor egy hianyt mero allitast egy URES VILAG is
 * kielegit -- csak itt nem ures a vilag, hanem a fixtura nem er el az egyik
 * ágába.
 */
const akciosTermek = () =>
  ({
    id: "prod_akcios",
    variants: [
      {
        id: "v1",
        calculated_price: {
          calculated_amount: 92000,
          original_amount: 100000,
          currency_code: "huf",
          calculated_price: { price_list_type: "sale" },
        },
      },
    ],
  }) as never

describe("az akciós ár", () => {
  /**
   * ISMERT POZITIV KONTROLL, ES ITT EZ A LEGFONTOSABB ALLITAS A HAROM KOZUL.
   *
   * Enelkul mind a ket alabbi allitas zold lenne akkor is, ha a fixturam NEM
   * hozza elo az akcios agat -- pontosan az a hiba, amit ez a szakasz leplez le.
   */
  it("a fixtúra tényleg előhozza az akciós ágat", () => {
    render(<ProductPrice product={akciosTermek()} />)

    expect(screen.getByTestId("original-product-price")).toBeTruthy()
    expect(screen.getByTestId("product-price-szazalek")).toBeTruthy()
  })

  /**
   * A REZ EGY DOLGOT JELOLJON EGY LAPON: HOVA KATTINTS (picasso dontese,
   * acrobot msg 15302). A Kosarba gomb es a jelveny mar ezt teszik, tehat az ar
   * nem kaphat rezet -- ket egyenrangu hangos pont kioltana egymast.
   *
   * Az "akcios" jelentest a FELKOVER szedes es az athuzott regi ar hordozza.
   */
  it("az akciós ár nem visel réz akcentet, hanem félkövér", () => {
    render(<ProductPrice product={akciosTermek()} />)
    const ar = screen.getByTestId("product-price")
    const burok = ar.parentElement

    expect(burok?.className).toContain("font-bold")
    expect(burok?.className).not.toContain("text-ui-fg-")
    expect(burok?.style.color).toBe("")
  })

  /**
   * A SZAZALEK ES A "MELLETTE" FELIRAT IS TOKENBOL JON, NEM ROGZITETT SZINBOL.
   *
   * A jsdom nem oldja fel a CSS-valtozokat, tehat ez a TOKEN NEVET meri.
   */
  it("a százalék a halvány szöveg tokenjét viseli", () => {
    render(<ProductPrice product={akciosTermek()} />)

    expect(screen.getByTestId("product-price-szazalek").style.color).toBe(
      "var(--terv-szoveg-halvany)",
    )
  })

  /**
   * ES AZ ANGOL FELIRAT, MOST MAR OLYAN AGON, AHOL LATSZIK IS.
   *
   * A keszlet masik ilyen allitasa nem-akcios terméket renderel. A ketto egyutt
   * fedi le a komponenst; kulon-kulon egyik sem allithatja azt, amit a cime igér.
   */
  it("az akciós ágon sem jelenik meg angol felirat", () => {
    const { container } = render(<ProductPrice product={akciosTermek()} />)

    expect(container.textContent).not.toContain("Original")
    expect(container.textContent).toContain("Eredeti ár")
  })
})
