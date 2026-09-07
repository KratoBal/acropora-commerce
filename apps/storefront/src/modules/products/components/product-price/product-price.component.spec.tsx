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
