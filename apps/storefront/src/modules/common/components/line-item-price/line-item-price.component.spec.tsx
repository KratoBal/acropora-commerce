import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LineItemPrice from "./index"
import LineItemUnitPrice from "../line-item-unit-price"

afterEach(cleanup)

/*
  A KOZOS SORAR-KOMPONENSEK (rendeles, kosar-lenyilo) ATHUZASA CSAK VALODI ARCSOKKENTESNEL (Omnibus 2/A., acrobot 2026-11-19). MI PIROSIT:
  ha a metaadat nelkuli sor az `original_total` alapjan athuz; ha az athuzott ar vagy a szazalek a listaarbol szamol; ha a felirat
  megint angol ("Original:").
*/
const omnibus = (amount: string) => ({
  omnibus_lowest_price_30d: JSON.stringify({
    amount,
    currency: "huf",
    complete: true,
    history_begins: "2026-09-01",
    reduction_start: "2026-11-10",
  }),
})
const sor = (metadata: Record<string, unknown> | null) =>
  ({
    quantity: 2,
    total: 184000,
    original_total: 300000,
    variant: { metadata },
  }) as never

describe("a sor ára", () => {
  it("metaadat nélkül nincs áthúzás és százalék, csak a fizetendő ár", () => {
    const { container } = render(
      <LineItemPrice item={sor(null)} currencyCode="huf" />,
    )
    expect(screen.queryByTestId("product-original-price")).toBeNull()
    expect(container.textContent).not.toContain("%")
    expect(screen.getByTestId("product-price").textContent).toMatch(/184\s000/)
  })

  it("valódi árcsökkentésnél a referencia sorösszege és a hozzá viszonyított százalék áll, magyar felirattal", () => {
    // 2 db x 100 000 referencia = 200 000, fizetendő 184 000: -8%
    const { container } = render(
      <LineItemPrice item={sor(omnibus("100000"))} currencyCode="huf" />,
    )
    expect(screen.getByTestId("product-original-price").textContent).toMatch(
      /200\s000/,
    )
    expect(container.textContent).toContain("-8%")
    expect(container.textContent).toContain("Korábbi legalacsonyabb ár")
    expect(container.textContent).not.toContain("Original")
  })

  it("az egységár ugyanígy: metaadat nélkül nincs, csökkentésnél a referencia egységára", () => {
    const nincs = render(
      <LineItemUnitPrice item={sor(null)} currencyCode="huf" />,
    )
    expect(screen.queryByTestId("product-unit-original-price")).toBeNull()
    nincs.unmount()
    const van = render(
      <LineItemUnitPrice item={sor(omnibus("100000"))} currencyCode="huf" />,
    )
    expect(
      screen.getByTestId("product-unit-original-price").textContent,
    ).toMatch(/100\s000/)
    expect(van.container.textContent).toContain("-8%")
    expect(van.container.textContent).toContain("Korábbi legalacsonyabb ár")
    expect(van.container.textContent).not.toContain("Original")
  })
})
