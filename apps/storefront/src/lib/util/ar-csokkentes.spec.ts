import { describe, expect, it } from "vitest"

import { arCsokkentesOf, getPricesForVariant } from "./get-product-price"

/*
  AZ ARCSOKKENTES KOZLESE A 30 NAPOS LEGALACSONYABB AR ALAPJAN (card 54bb3779, acrobot 2026-11-19). MI PIROSIT: az athuzott "korabbi
  ar" a Medusa alapara (nem a hivatkozasi ar); a szazalek az alapárhoz jar; akcio nelkuli termek is kap athuzast; hivatkozasi ar
  nelkul, vagy ha a vevo ara nem kisebb nala (a mert eset: az ai-nero-3, referencia 69 600 = fizetendo 69 600, alapar 87 000), is
  megjelenik athuzott ar es szazalek; egy hibas vagy ellentmondo metaadat egy "kozlest" hoz.
*/
const referencia = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    amount: "95000",
    currency: "HUF",
    history_begins: "2026-11-05",
    complete: false,
    reduction_start: "2026-11-19",
    ...over,
  })

const valtozat = (
  over: {
    calculated?: number
    original?: number
    tipus?: string | null
    metadata?: unknown
    currency?: string
  } = {},
) =>
  ({
    id: "v1",
    metadata:
      "metadata" in over
        ? over.metadata
        : { omnibus_lowest_price_30d: referencia() },
    calculated_price: {
      calculated_amount: over.calculated ?? 76000,
      original_amount: over.original ?? 100000,
      currency_code: over.currency ?? "huf",
      calculated_price: {
        price_list_type: "tipus" in over ? over.tipus : "sale",
      },
    },
  }) as never

describe("arCsokkentesOf", () => {
  it("a kozles a HIVATKOZASI arra epul: az athuzott ar a referencia, a szazalek hozza jar (nem az alapárhoz)", () => {
    const csokkentes = arCsokkentesOf(valtozat())
    expect(csokkentes?.reference_number).toBe(95000)
    expect(csokkentes?.reference).toContain("95")
    expect(csokkentes?.reference).not.toContain("100")
    // (95 000 - 76 000) / 95 000 = 20 %, az alapárhoz mérve 24 % lenne
    expect(csokkentes?.percentage_diff).toBe("20")
  })

  it("a mert eset: a referencia nem magasabb a fizetendonel (az alapar 87 000 egy fagyott UNAS-ar): nincs kozles", () => {
    const csokkentes = arCsokkentesOf(
      valtozat({
        calculated: 69600,
        original: 87000,
        metadata: { omnibus_lowest_price_30d: referencia({ amount: "69600" }) },
      }),
    )
    expect(csokkentes).toBeNull()
  })

  it("a referencia ALATT levo fizetendo ar: nincs kozles akkor sem, ha az alapar tobb (a referencia a mervado)", () => {
    expect(
      arCsokkentesOf(
        valtozat({
          calculated: 80000,
          original: 200000,
          metadata: {
            omnibus_lowest_price_30d: referencia({ amount: "80000" }),
          },
        }),
      ),
    ).toBeNull()
    expect(
      arCsokkentesOf(
        valtozat({
          calculated: 90000,
          original: 200000,
          metadata: {
            omnibus_lowest_price_30d: referencia({ amount: "80000" }),
          },
        }),
      ),
    ).toBeNull()
  })

  it("hivatkozasi ar nelkul nincs kozles, az akcios arlista ellenere sem", () => {
    for (const metadata of [undefined, null, {}, { masik: "x" }])
      expect(
        arCsokkentesOf(valtozat({ metadata })),
        JSON.stringify(metadata),
      ).toBeNull()
  })

  it("hibas vagy ellentmondo hivatkozas nem kozles: rossz JSON, nem szam, mas penznem, ellentmondo napok", () => {
    for (const metadata of [
      { omnibus_lowest_price_30d: "nem json" },
      { omnibus_lowest_price_30d: referencia({ amount: "sok" }) },
      { omnibus_lowest_price_30d: referencia({ amount: "-5" }) },
      { omnibus_lowest_price_30d: referencia({ currency: "EUR" }) },
      // a "teljes" elozmeny, amelynek napjai nem allnak ossze
      {
        omnibus_lowest_price_30d: referencia({
          complete: true,
          history_begins: "2026-11-05",
        }),
      },
      // a fiatal elozmeny, amely a 30 napos ablak elott kezdodik (lyuk)
      {
        omnibus_lowest_price_30d: referencia({
          complete: false,
          history_begins: "2026-10-01",
        }),
      },
    ])
      expect(
        arCsokkentesOf(valtozat({ metadata })),
        JSON.stringify(metadata),
      ).toBeNull()
  })

  it("akcios arlista nelkul nincs kozles, a referencia ellenere sem", () => {
    for (const tipus of [null, "default", "override", undefined])
      expect(
        arCsokkentesOf(valtozat({ tipus: tipus as never })),
        String(tipus),
      ).toBeNull()
  })

  it("ar nelkul nincs semmi", () => {
    expect(arCsokkentesOf(null)).toBeNull()
    expect(arCsokkentesOf(undefined)).toBeNull()
    expect(
      arCsokkentesOf({
        id: "v",
        metadata: {},
        calculated_price: { calculated_amount: 0 },
      } as never),
    ).toBeNull()
  })
})

describe("getPricesForVariant", () => {
  it("a `reduction` mezo hordozza a kozlest, az alapar mezoi megmaradnak", () => {
    const arak = getPricesForVariant(valtozat())
    expect(arak?.reduction?.reference_number).toBe(95000)
    expect(arak?.original_price_number).toBe(100000)
    expect(arak?.price_type).toBe("sale")
  })

  it("a mert eset: az ar akcios arlistas, de a `reduction` null", () => {
    const arak = getPricesForVariant(
      valtozat({
        calculated: 69600,
        original: 87000,
        metadata: { omnibus_lowest_price_30d: referencia({ amount: "69600" }) },
      }),
    )
    expect(arak?.price_type).toBe("sale")
    expect(arak?.reduction).toBeNull()
  })
})
