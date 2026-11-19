import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import PreviewPrice from "./price"

afterEach(cleanup)

/*
  AZ ELONEZETI AR ATHUZASA CSAK VALODI ARCSOKKENTESNEL (Omnibus 2/A., 2026-11-19). MI PIROSIT: ha az athuzott ar a
  listaar (`original_price`) vagy akkor is megjelenik, amikor az ar-objektumnak nincs `reduction`-je.
*/
const ar = (reduction: unknown) =>
  ({
    calculated_price_number: 92000,
    calculated_price: "92 000 Ft",
    original_price_number: 150000,
    original_price: "150 000 Ft",
    currency_code: "huf",
    price_type: "sale",
    percentage_diff: "39",
    reduction,
  }) as never

describe("az előnézeti ár", () => {
  it("valódi csökkentésnél a referencia-árat húzza át, nem a listaárat", async () => {
    render(
      await PreviewPrice({
        price: ar({
          reference_price_number: 100000,
          reference_price: "100 000 Ft",
          percentage_diff: "8",
        }),
      }),
    )
    expect(screen.getByTestId("original-price").textContent).toBe("100 000 Ft")
    expect(screen.getByTestId("price").textContent).toBe("92 000 Ft")
  })

  it("csökkentés nélkül (akciós ár is) nincs áthúzás, az ár megmarad", async () => {
    render(await PreviewPrice({ price: ar(null) }))
    expect(screen.queryByTestId("original-price")).toBeNull()
    expect(screen.getByTestId("price").textContent).toBe("92 000 Ft")
  })
})
