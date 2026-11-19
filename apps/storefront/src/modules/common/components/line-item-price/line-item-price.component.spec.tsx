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
const sor = (
  metadata: Record<string, unknown> | null,
  over: { unit_price?: number; total?: number } = {},
) =>
  ({
    quantity: 2,
    unit_price: over.unit_price ?? 92000,
    total: over.total ?? 184000,
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

  it("a százalék lefelé kerekít (nem 34, hanem 33), és ha 0-ra kerekedik, nincs jelzés (az áthúzás marad)", () => {
    // referencia 10 000, ár 6 650: valódi csökkentés 33,5 %
    const a = render(
      <LineItemPrice
        item={sor(omnibus("10000"), { unit_price: 6650, total: 13300 })}
        currencyCode="huf"
      />,
    )
    expect(a.container.textContent).toContain("-33%")
    expect(a.container.textContent).not.toContain("-34%")
    a.unmount()
    // referencia 10 000, ár 9 960: 0,4 %: nincs százalék, az áthúzás marad
    const b = render(
      <LineItemPrice
        item={sor(omnibus("10000"), { unit_price: 9960, total: 19920 })}
        currencyCode="huf"
      />,
    )
    expect(b.container.textContent).not.toContain("%")
    expect(screen.getByTestId("product-original-price")).toBeTruthy()
  })

  it("a kupon nem árcsökkentés: a kuponnal csökkentett, de árában nem csökkent sor nem húz át, és a százalék a kupontól független", () => {
    const nincs = render(
      <LineItemPrice
        item={sor(omnibus("100000"), { unit_price: 100000, total: 180000 })}
        currencyCode="huf"
      />,
    )
    expect(screen.queryByTestId("product-original-price")).toBeNull()
    expect(nincs.container.textContent).not.toContain("%")
    nincs.unmount()
    const kuponnal = render(
      <LineItemPrice
        item={sor(omnibus("100000"), { unit_price: 92000, total: 150000 })}
        currencyCode="huf"
      />,
    )
    expect(kuponnal.container.textContent).toContain("-8%")
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
