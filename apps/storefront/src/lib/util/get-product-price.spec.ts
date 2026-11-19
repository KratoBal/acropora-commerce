import { describe, expect, it } from "vitest"

import { getPricesForVariant } from "./get-product-price"

/*
  A VALODI ARCSOKKENTES AZ AR-OBJEKTUMBAN (Omnibus 2/A., acrobot eles-kiadasi feltetel 2, 2026-11-19). MI PIROSIT: ha a
  `reduction` a listaarbol (`original_amount`) szamol a 30 napos legalacsonyabb ar helyett; ha metaadat nelkul, nem kisebb
  akcios arral, nem-akcios arral vagy serult metaadattal mégis van; ha a szazalek a listaarhoz viszonyit; ha a referencia
  osszege vagy felirata elcsuszik.
*/
const omnibus = (amount: string, extra: Record<string, unknown> = {}) => ({
  omnibus_lowest_price_30d: JSON.stringify({
    amount,
    currency: "huf",
    complete: true,
    history_begins: "2026-09-01",
    reduction_start: "2026-11-10",
    ...extra,
  }),
})

const valtozat = (
  calculated: number,
  original: number,
  tipus: string | null,
  metadata?: Record<string, unknown> | null,
) =>
  ({
    id: "v1",
    metadata,
    calculated_price: {
      calculated_amount: calculated,
      original_amount: original,
      currency_code: "huf",
      calculated_price: { price_list_type: tipus },
    },
  }) as never

describe("getPricesForVariant: a valódi árcsökkentés", () => {
  it("a referencia a 30 napos legalacsonyabb ár, a százalék ahhoz képest (nem a listaárhoz)", () => {
    const ar = getPricesForVariant(
      valtozat(92000, 150000, "sale", omnibus("100000")),
    )!
    expect(ar.reduction).toEqual({
      reference_price_number: 100000,
      reference_price: expect.stringMatching(/^100\s000\sFt$/),
      percentage_diff: "8",
    })
    // a régi mezők változatlanok (a lista ára és a hozzá viszonyított százalék)
    expect(ar.original_price_number).toBe(150000)
    expect(ar.percentage_diff).toBe("39")
  })

  it("nincs csökkentés: metaadat nélkül, egyenlő vagy magasabb akciós árnál, nem-akciós áron, sérült vagy idegen pénznemű metaadattal", () => {
    const esetek = [
      valtozat(92000, 150000, "sale", null),
      valtozat(92000, 150000, "sale", undefined),
      valtozat(92000, 150000, "sale", {}),
      valtozat(100000, 150000, "sale", omnibus("100000")),
      valtozat(110000, 150000, "sale", omnibus("100000")),
      valtozat(92000, 150000, null, omnibus("100000")),
      valtozat(92000, 150000, "default", omnibus("100000")),
      valtozat(92000, 150000, "sale", {
        omnibus_lowest_price_30d: "{rossz",
      }),
      valtozat(92000, 150000, "sale", omnibus("100000", { currency: "eur" })),
      valtozat(92000, 150000, "sale", omnibus("0")),
    ]
    for (const eset of esetek)
      expect(getPricesForVariant(eset)!.reduction).toBeNull()
  })

  it("a mért teszt-eset: lista 87 000, 30 napos legalacsonyabb 69 600, akciós 69 600: nincs csökkentés", () => {
    expect(
      getPricesForVariant(valtozat(69600, 87000, "sale", omnibus("69600")))!
        .reduction,
    ).toBeNull()
  })
})
