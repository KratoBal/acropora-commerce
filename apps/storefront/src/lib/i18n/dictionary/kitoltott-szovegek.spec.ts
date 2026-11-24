import { describe, expect, it } from "vitest"

import { CEG } from "@lib/ceg"
import { en } from "./en"
import { hu } from "./hu"

/**
 * A KODBOL KITOLTHETO HELYORZOK (2026-11-19, barracuda bontasa): az elerhetoseg a
 * lablec es az Elerhetosegek lap KOZOS adata (`CEG`), a varakozas ideje a szerver
 * korlatja (15 perc, a backend tesztje tartja), a fotok szama es merete dontott
 * (5 db, 5 MB). MI PIROSIT: ha egy szoveg ujra helyorzot tartalmaz; ha az
 * elerhetoseg elter a lablec adatatol (nem egy forrasbol jon); ha a "15 perc"
 * eltunik; ha a fotokorlat szovege mas szamot mond, mint a kod konstansa.
 */
const KONTAKT = [
  hu.guestOrder.errorNotFound,
  hu.guestOrder.errorUnavailable,
  hu.guestOrder.problem.errorSend,
  hu.guestOrder.withdrawal.errorUnknown,
  hu.guestOrder.withdrawal.errorSend,
]
const KONTAKT_EN = [
  en.guestOrder.errorNotFound,
  en.guestOrder.errorUnavailable,
  en.guestOrder.problem.errorSend,
  en.guestOrder.withdrawal.errorUnknown,
  en.guestOrder.withdrawal.errorSend,
]

describe("a kodbol kitoltott szovegek", () => {
  it("az elerhetoseg a lablec es az Elerhetosegek lap kozos adata", () => {
    for (const szoveg of [...KONTAKT, ...KONTAKT_EN]) {
      expect(szoveg).toContain(CEG.email)
      expect(szoveg).not.toMatch(/KITÖLTENDŐ|TO BE FILLED/)
    }
  })

  it("a varakozas ideje: 15 perc, mindket nyelven", () => {
    expect(hu.guestOrder.errorTooMany).toContain("15 perc")
    expect(en.guestOrder.errorTooMany).toContain("15 minutes")
    expect(hu.guestOrder.errorTooMany).not.toMatch(/KITÖLTENDŐ/)
    expect(en.guestOrder.errorTooMany).not.toMatch(/TO BE FILLED/)
  })

  it("a fotokorlat szovege a kod konstansait mondja, helyorzo nelkul", async () => {
    const { MAX_PHOTOS, MAX_PHOTO_BYTES } =
      await import("@lib/util/problem-report")
    const mb = String(MAX_PHOTO_BYTES / (1024 * 1024))
    for (const d of [hu.guestOrder.problem, en.guestOrder.problem]) {
      expect(d.photoErrorSize).toContain(`${mb} MB`)
      expect(d.photoErrorCount).toContain(String(MAX_PHOTOS))
      expect(d.photoErrorSize + d.photoErrorCount).not.toMatch(
        /KITÖLTENDŐ|TO BE FILLED/,
      )
    }
  })

  it("az elallas utani teendok az ASZF szerint, helyorzo nelkul (acrobot 60571; murena Fogyasztobarat-felmerese)", () => {
    for (const [szoveg, napok, visszakuldes] of [
      [
        hu.guestOrder.withdrawal.done,
        "14 napon belül küldd vissza",
        "14 napon belül visszautaljuk",
      ],
      [
        en.guestOrder.withdrawal.done,
        "within 14 days of your declaration",
        "within 14 days of receiving your declaration",
      ],
    ] as const) {
      expect(szoveg).not.toMatch(/KITÖLTENDŐ|TO BE FILLED/)
      expect(szoveg).toContain("{id}")
      expect(szoveg).toContain(napok)
      expect(szoveg).toContain(visszakuldes)
    }
    // a visszakuldes kozvetlen koltsege a vevoe, es a hatarido a feladassal teljesul (murena 60605, az ASZF szerint)
    expect(hu.guestOrder.withdrawal.done).toContain(
      "A visszaküldés közvetlen költségét te viseled",
    )
    expect(hu.guestOrder.withdrawal.done).toContain(
      "a határidőt megtartod, ha addig feladod",
    )
    expect(en.guestOrder.withdrawal.done).toContain(
      "You bear the direct cost of returning it",
    )
    // a 45/2014. Korm. rendeletre a vevonek szolo szoveg nem hivatkozik (acrobot 60571)
    expect(hu.guestOrder.withdrawal.done).not.toMatch(/Korm\.|rendelet/)
  })

  it("murena dontesi lapjanak ot mondata kezdoertekkent all, helyorzo nelkul (acrobot 60627, kartya 7bfca4eb)", () => {
    const d = [hu.guestOrder, en.guestOrder]
    for (const g of d) {
      for (const szoveg of [
        g.status.closedUnsuccessfully.text,
        g.payment.awaiting.text,
        g.payment.refunded.text,
        g.payment.partiallyRefunded.text,
        g.invoice.none,
        g.problem.done,
      ])
        expect(szoveg).not.toMatch(/KITÖLTENDŐ|TO BE FILLED/)
    }
    expect(hu.guestOrder.status.closedUnsuccessfully.text).toContain(
      "14 napon belül",
    )
    // a 3-as (b) valtozata: a lemondasrol Balazs meg nem dontott
    expect(hu.guestOrder.payment.awaiting.text).toContain(
      "felvesszük veled a kapcsolatot",
    )
    expect(hu.guestOrder.problem.done).toContain("2 munkanapon belül")
  })

  it("a jogi szovegek helyorzoi MARADNAK (Balazs dontese): nem tuntek el vele egyutt", () => {
    expect(hu.guestOrder.splitNotice + JSON.stringify(hu.guestOrder)).toMatch(
      /KITÖLTENDŐ: (jogi ellenőrzés|válaszidő|jogi szöveg élő állatra)/,
    )
  })
})
