import { describe, expect, it } from "vitest"

import { stripeEgyseg } from "./stripe-egyseg"

/**
 * A HALASZTOTT KÁRTYAMEZŐ ÖSSZEGE A HÁTTÉR INTENTJÉVEL EGYEZIK (Stripe
 * legkisebb egység, ahogy a háttér a csomag függvényével számolja). MI
 * PIROSÍT: ha a forint nulla-tizedesként menne (100-szor kisebb összeg).
 */
describe("stripeEgyseg", () => {
  it("forint és euró századokban, jen egészben, KWD ezredekben tízre kerekítve", () => {
    expect(stripeEgyseg(21950, "huf")).toBe(2_195_000)
    expect(stripeEgyseg(12.34, "EUR")).toBe(1234)
    expect(stripeEgyseg(500, "jpy")).toBe(500)
    expect(stripeEgyseg(1.2345, "KWD")).toBe(1240)
  })
})
