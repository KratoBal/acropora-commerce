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
