import { describe, expect, it } from "vitest"

import {
  dijSor,
  fizetesiMod,
  osszesitoSorok,
  termekTetelek,
  vegosszegCimke,
} from "./rendeles-reszletek"

/** A stage elso kirakat-rendelesenek alakja (2026-09-29), szemelyes adat nelkul. */
const RENDELES = {
  items: [
    {
      id: "i1",
      title: "Aquavital Perlonvatta 100g",
      product_title: "Aquavital Perlonvatta 100g",
      quantity: 1,
      total: 1000,
      metadata: {},
    },
    {
      id: "i2",
      title: "Utánvét kezelési díj",
      product_title: null,
      quantity: 1,
      total: 450,
      metadata: {
        fee_type: "cash_on_delivery",
        acropora_line_item_kind: "fee",
      },
    },
  ],
  shipping_methods: [{ name: "GLS házhozszállítás", total: 3500 }],
  total: 4950,
  payment_status: "awaiting",
  payment_collections: [
    { payments: [], payment_sessions: [{ provider_id: "pp_acropora_cod" }] },
  ],
}

/**
 * A RESZLETEK SZAMAI (249:172). MI PIROSIT: ha a dijsor termeknek szamit; ha
 * a fizetesi mod nyers azonositokent jelenik meg, vagy a munkamenetbol nem
 * olvassa ki; ha a vegosszeg "Fizetett"-nek mondja a meg ki nem fizetett
 * rendelest.
 */
describe("a rendelés részleteinek számai", () => {
  it("a díjsor nem termék", () => {
    expect(dijSor(RENDELES.items[1])).toBe(true)
    expect(dijSor(RENDELES.items[0])).toBe(false)
    expect(termekTetelek(RENDELES).map((t) => t.id)).toEqual(["i1"])
  })

  it("az összesítő: Termékek, a díj a saját nevével, a szállítás a módjával", () => {
    expect(osszesitoSorok(RENDELES)).toEqual([
      { cimke: "Termékek", osszeg: 1000 },
      { cimke: "Utánvét kezelési díj", osszeg: 450 },
      { cimke: "GLS házhozszállítás", osszeg: 3500 },
    ])
  })

  it("a fizetési mód a pénztár szótárából: kész fizetés, különben a munkamenet", () => {
    expect(fizetesiMod(RENDELES)).toBe("Utánvét")
    expect(
      fizetesiMod({
        payment_collections: [
          {
            payments: [{ provider_id: "pp_system_default" }],
            payment_sessions: [{ provider_id: "pp_acropora_cod" }],
          },
        ],
      }),
    ).toBe("Fizetés átvételkor")
    expect(
      fizetesiMod({
        payment_collections: [
          { payment_sessions: [{ provider_id: "pp_ismeretlen" }] },
        ],
      }),
    ).toBe("")
  })

  it("Fizetett összeg csak kifizetett rendelésnél, különben Végösszeg", () => {
    expect(vegosszegCimke("captured")).toBe("Fizetett összeg")
    expect(vegosszegCimke("awaiting")).toBe("Végösszeg")
    expect(vegosszegCimke(null)).toBe("Végösszeg")
  })
})
