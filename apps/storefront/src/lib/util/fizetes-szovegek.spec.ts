import { translator } from "@lib/i18n/dictionary"
import { describe, expect, it } from "vitest"

import {
  ASZF_PIPA_SZOVEG,
  MEGRENDEL_GOMB_FELIRAT,
  aszfPipaReszek,
} from "./megrendeles"
import {
  FIZETESI_SZEREP_CIMKE,
  fizetesiModAlcim,
  fizetesiModCimke,
} from "./fizetesi-modok"
import { JOGI_TESZT_SZOVEG } from "./jogi-kapu"
import { szallitasiCsoportok } from "./fizetesi-oldal"
import {
  ELUTASITOTT_KARTYA,
  STRIPE_BIZALMI_SZOVEG,
  stripeGombFelirat,
} from "./stripe-allapot"

/**
 * A FIZETÉS SZÖVEGEI KÉT HELYEN ÁLLNAK: a konstansban (a régi hívóknak, és a
 * rendelés visszaigazoló lapjának, a fiók fizetési linkjének) és a szótárban (a
 * pénztár ezt írja ki). A kettő nem csúszhat el: a magyar szótár BETŰ SZERINT a
 * konstans. EZ A JOGI MONDATRA IS ÁLL: az ÁSZF-pipa szövege nem változhat
 * észrevétlenül.
 */
describe("a magyar szótár betű szerint a konstansok szövege", () => {
  const hu = translator("hu")

  it("az ÁSZF-pipa mondata (jogi szöveg) öt részben és egészben", () => {
    expect(Object.values(aszfPipaReszek(hu)).join("")).toBe(ASZF_PIPA_SZOVEG)
  })

  it("a gomb, a teszt-kirakat, a Stripe és az elutasítás mondata", () => {
    expect(hu("checkoutPayment.placeOrder")).toBe(MEGRENDEL_GOMB_FELIRAT)
    expect(hu("checkoutPayment.legalTest")).toBe(JOGI_TESZT_SZOVEG)
    expect(hu("checkoutPayment.trust")).toBe(STRIPE_BIZALMI_SZOVEG)
    expect(hu("checkoutPayment.cardDeclined")).toBe(ELUTASITOTT_KARTYA)
  })

  it("a fizetési módok magyar neve", () => {
    expect(FIZETESI_SZEREP_CIMKE).toEqual({
      ONLINE_CARD: "Bankkártyás fizetés",
      COD: "Utánvét",
      PAY_AT_STORE: "Fizetés átvételkor",
      BANK_TRANSFER: "Előre utalás",
    })
  })
})

describe("a fizetés szövegei angolul", () => {
  const en = translator("en")

  it("a módok neve és alcíme", () => {
    expect(fizetesiModCimke({ id: "x", role: "COD" }, en)).toBe(
      "Cash on delivery",
    )
    expect(fizetesiModAlcim({ id: "x", role: "COD" }, en)).toBeUndefined()
    expect(fizetesiModAlcim({ id: "x", role: "BANK_TRANSFER" }, en)).toBe(
      "Proforma invoice by email, payable within 8 days",
    )
  })

  it("a gomb felirata állapotonként", () => {
    expect(stripeGombFelirat("alap", en)).toBe("Place order")
    expect(stripeGombFelirat("feldolgozas", en)).toBe("Processing…")
    expect(stripeGombFelirat("ellenorzes", en)).toBe("Checking…")
    expect(stripeGombFelirat("elutasitva", en)).toBe("Try again")
    expect(stripeGombFelirat("alap")).toBe("Megrendel")
  })

  it("az ÁSZF-pipa öt része a két dokumentumra mutató hivatkozásokkal", () => {
    expect(Object.values(aszfPipaReszek(en)).join("")).toContain(
      "I accept the Terms and Conditions and the Privacy Notice.",
    )
  })

  it("a szállítási csoportok címkéi", () => {
    const csoportok = szallitasiCsoportok(
      {
        items: [
          { id: "a", title: "Só", quantity: 1, total: 1000 },
          { id: "b", title: "Frag", quantity: 1, total: 9000 },
        ],
        shipping_methods: [{ name: "GLS", amount: 3500 }],
        shipping_address: { city: "Budapest", postal_code: "1111" },
      },
      new Set(["b"]),
      en,
    )
    expect(csoportok.map((c) => c.cimke)).toEqual([
      "1. Delivery",
      "2. Live animals",
    ])
    expect(csoportok[1].mod).toBe("Pickup in the store")
  })
})
