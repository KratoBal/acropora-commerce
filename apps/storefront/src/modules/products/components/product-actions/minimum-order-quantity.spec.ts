import { describe, expect, it } from "vitest"

import { minimumOrderQuantity } from "./minimum-order-quantity"

const termek = (ertek: unknown) =>
  ({ metadata: { unas_minimum_order_quantity: ertek } }) as never

/**
 * A VALÓS ÉRTÉKEK a 2026-09-02-i UNAS exportból jönnek, nem kitalált számok:
 * 1877 terméknél 1, nyolcnál 10, hétnél 100, egynél 5.
 *
 * A vetítés SZTRINGKÉNT írja a metaadatba (mérve a stage Store API-ján: mind a
 * 19 terméknél `"1"`), ezért a sztring-alak az elsődleges eset, nem a szám.
 */
describe("minimális rendelési mennyiség", () => {
  it("a valós értékeket sztringből olvassa", () => {
    expect(minimumOrderQuantity(termek("1"))).toBe(1)
    expect(minimumOrderQuantity(termek("5"))).toBe(5)
    expect(minimumOrderQuantity(termek("10"))).toBe(10)
    expect(minimumOrderQuantity(termek("100"))).toBe(100)
  })

  it("számként érkező értéket is elfogad", () => {
    expect(minimumOrderQuantity(termek(10))).toBe(10)
  })

  /**
   * A HIÁNY A GYAKORI ESET, NEM A KIVÉTEL: 1877 termék nem hoz értelmes
   * minimumot, és mindegyiknek 1-et kell adnia.
   */
  it("hiányzó metaadatnál 1", () => {
    expect(minimumOrderQuantity({ metadata: null } as never)).toBe(1)
    expect(minimumOrderQuantity({ metadata: {} } as never)).toBe(1)
    expect(minimumOrderQuantity(null)).toBe(1)
    expect(minimumOrderQuantity(undefined)).toBe(1)
  })

  /**
   * AZ ÉRTÉK KÍVÜLRŐL JÖN, tehát minden nem értelmezhető alak 1-re esik vissza.
   * Ez a BIZTONSÁGOS irány: egy hibás metaadat ne zárja el a terméket a vevő
   * elől azzal, hogy százat kér belőle.
   *
   * A `"0"` és a `"-5"` külön áll: ezek SZÁMOK, tehát a puszta `Number()` átengedné
   * őket, és egy nulla alsó határ a léptetőt nullára engedné vinni.
   */
  it("értelmezhetetlen vagy értelmetlen értéknél 1", () => {
    expect(minimumOrderQuantity(termek("0"))).toBe(1)
    expect(minimumOrderQuantity(termek("-5"))).toBe(1)
    expect(minimumOrderQuantity(termek("2.5"))).toBe(1)
    expect(minimumOrderQuantity(termek("tíz"))).toBe(1)
    expect(minimumOrderQuantity(termek(""))).toBe(1)
    expect(minimumOrderQuantity(termek(null))).toBe(1)
    expect(minimumOrderQuantity(termek(true))).toBe(1)
    expect(minimumOrderQuantity(termek([10]))).toBe(1)
  })
})
