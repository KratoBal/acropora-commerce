import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import CartTotals from "./index"

afterEach(cleanup)

/**
 * A MERT SZAMOK (acrobot, 2026-09-07, egy valodi kosaron a teszt bolton):
 *
 *     item_subtotal    944,88   (NETTO)
 *     item_tax_total   255,12
 *     total          1200,00   (BRUTTO)
 *
 * A termeklapon 1200 Ft all. Ha a kosar reszosszege 944,88-at mutatna, a vevo
 * ket kulonbozo szamot latna UGYANARRA a termekre.
 */
const MERT = {
  currency_code: "huf",
  item_subtotal: 944.88,
  item_tax_total: 255.12,
  shipping_subtotal: 0,
  discount_subtotal: 0,
  tax_total: 255.12,
  total: 1200,
}

describe("a kosár összegzése", () => {
  it("a részösszeg BRUTTÓ: a nettó és az adó összege", () => {
    render(<CartTotals totals={MERT} />)

    // A `data-value` a NYERS szam, tehat a formazastol fuggetlenul allithato.
    expect(screen.getByTestId("cart-subtotal")).toHaveAttribute(
      "data-value",
      "1200",
    )
  })

  /**
   * ES AZ ISMERT POZITIV KONTROLL: a netto ertek NEM jelenik meg a vevonek.
   *
   * === EGY HALOTT ALLITAS, AMIT A KALIBRACIO FOGOTT MEG ===
   *
   * Ez a sor eloszor `944`-re keresett, es a rontas (netto reszosszeg) mellett
   * ZOLD MARADT -- vagyis semmit nem mert. Az ok: a formazo EGESZ forintra
   * kerekit, tehat a lapon soha nem all "944", hanem "945 Ft".
   *
   * Ugyanaz az alak, amit masoknak egesz nap irok: egy tagado allitas, ami
   * olyan szoveget keres, ami elo sem fordul, ALLANDOAN igaz. A szamot ezert a
   * KIIRT alakbol kell venni, nem a bemenetbol.
   */
  it("a nettó részösszeg sehol nem áll a lapon", () => {
    const { container } = render(<CartTotals totals={MERT} />)

    expect(container.textContent ?? "").not.toContain("945")
    // ES A POZITIV FELE: a brutto ERTEK viszont OTT all, kiirva.
    expect(container.textContent ?? "").toContain("1200")
  })

  /**
   * AZ "EBBOL" SZO A LENYEG: e nelkul a vevo hozzaadja a fejeben, es 1455-ot
   * szamol 1200 helyett.
   */
  it("az adó sora INFORMÁCIÓS, és ezt a szó mondja meg", () => {
    render(<CartTotals totals={MERT} />)

    expect(screen.getByText("Ebből áfa")).toBeTruthy()
  })

  it("a fizetendő a total, változatlanul", () => {
    render(<CartTotals totals={MERT} />)

    expect(screen.getByTestId("cart-total")).toHaveAttribute(
      "data-value",
      "1200",
    )
  })

  /**
   * A HIANYZO ADO-ERTEK NEM NULLA, HANEM ISMERETLEN -- de a kiiras itt nem
   * tud mast tenni, mint a nettot mutatni. Az allitas azert all itt, hogy ez a
   * viselkedes KIMONDVA legyen: ha valaha valtozik, latszik.
   */
  it("adó-érték nélkül a nettó áll ott, és a fizetendő akkor is a total", () => {
    render(
      <CartTotals
        totals={{ ...MERT, item_tax_total: undefined, tax_total: undefined }}
      />,
    )

    expect(screen.getByTestId("cart-subtotal")).toHaveAttribute(
      "data-value",
      "944.88",
    )
    expect(screen.getByTestId("cart-total")).toHaveAttribute(
      "data-value",
      "1200",
    )
  })
})
