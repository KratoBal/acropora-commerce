import { describe, expect, it } from "vitest"

import { translator } from "@lib/i18n/dictionary"
import {
  GLS_KOVETKEZO_LEPES,
  KOVETKEZO_LEPES,
  fizetesCimke,
  sikeroldal,
} from "./sikeroldal"

/**
 * A VISSZAIGAZOLO LAP (Figma 488:2 / 488:55 / 488:94). MI PIROSIT: ha a
 * FOXPOST-pont helyett a hazcim allna; ha vegyes kosarnal a bolti resz kerulne
 * elore, vagy a ket rendeles osszege nem a ketto egyutt; ha utanvetnel nem
 * latszana az atvetelkor fizetendo; ha a lap kovetesi szamot vagy levelet
 * igerne; ha a zarolt kartyat "fizetettnek" mondana.
 */
const foxpostRendeles = {
  id: "order_37",
  display_id: 37,
  email: "vevo@example.test",
  total: 14000,
  items: [{ id: "i1", product_title: "Hanna HI780-25", quantity: 1 }],
  shipping_address: {
    postal_code: "1111",
    city: "Budapest",
    address_1: "Teszt utca 1.",
  },
  shipping_methods: [
    {
      name: "Foxpost csomagpont",
      total: 1150,
      data: {
        foxpost_pickup_point: {
          id: "hu04",
          name: "FOXPOST A-BOX Bp. 02. ker. Budagyöngye",
          address: "1026 Budapest, Szilágyi E. fasor 121.",
          variant: "FOXPOST A-BOX",
        },
      },
    },
  ],
  payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe" }] }],
}
const boltiRendeles = {
  id: "order_38",
  display_id: 38,
  email: "vevo@example.test",
  total: 8500,
  items: [{ id: "i2", product_title: "Mithrax sculptus", quantity: 1 }],
  shipping_methods: [{ name: "Személyes átvétel", total: 0, data: {} }],
  payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe" }] }],
}

describe("a visszaigazoló lap", () => {
  it("egy FOXPOST-rendelés: a pont típusa, neve, címe, a tételek és a díj", () => {
    const lap = sikeroldal(foxpostRendeles, null, false)
    expect(lap.rendelesszam).toBe("#37")
    expect(lap.fizetes).toBe("Bankkártya")
    expect(lap.vegosszeg).toBe(14000)
    expect(lap.teljesitesek).toEqual([
      {
        cimke: "1. Kiszállítandó rendelés",
        szallito: "foxpost",
        tipus: "FOXPOST automata",
        hely: "FOXPOST A-BOX Bp. 02. ker. Budagyöngye",
        cim: "1026 Budapest, Szilágyi E. fasor 121.",
        tetelek: ["Hanna HI780-25 · 1 db"],
        szallitasiDij: 1150,
        atvetelkorFizetendo: null,
        kezelesiDij: null,
      },
    ])
  })

  it("vegyes kosár: a kiszállított elöl, a bolti utána, bármelyik rendelés lapjáról", () => {
    for (const lap of [
      sikeroldal(foxpostRendeles, boltiRendeles, true),
      sikeroldal(boltiRendeles, foxpostRendeles, false),
    ]) {
      expect(lap.rendelesszam).toBe("#37, #38")
      expect(lap.teljesitesek.map((t) => [t.cimke, t.szallito])).toEqual([
        ["1. Kiszállítandó rendelés", "foxpost"],
        ["2. Személyes átvétel", "bolt"],
      ])
      expect(lap.teljesitesek[1].cim).toBe("1106 Budapest, Pesti Gábor utca 35")
      expect(lap.vegosszeg).toBe(22500)
      expect(lap.rendelesekSzama).toBe(2)
    }
  })

  it("utánvét: az átvételkor fizetendő összeg és a kezelési díj külön, a díj nem tétel", () => {
    const lap = sikeroldal(
      {
        ...foxpostRendeles,
        total: 15600,
        items: [
          ...foxpostRendeles.items,
          {
            id: "fee",
            title: "Utánvét kezelési díj",
            quantity: 1,
            total: 450,
            metadata: {
              acropora_line_item_kind: "fee",
              fee_type: "cash_on_delivery",
            },
          },
        ],
        payment_collections: [
          { payments: [{ provider_id: "pp_acropora_cod" }] },
        ],
      },
      null,
      false,
    )
    expect(lap.fizetes).toBe("Utánvét")
    expect(lap.teljesitesek[0].atvetelkorFizetendo).toBe(15600)
    expect(lap.teljesitesek[0].kezelesiDij).toBe(450)
    expect(lap.teljesitesek[0].tetelek).toEqual(["Hanna HI780-25 · 1 db"])
  })

  it("házhozszállításnál a cím, tisztán bolti rendelésnél a bolt", () => {
    const haz = sikeroldal(
      {
        ...foxpostRendeles,
        shipping_methods: [
          { name: "GLS házhozszállítás", total: 3500, data: {} },
        ],
      },
      null,
      false,
    )
    // a GLS házhozszállítás GLS-ként, a GLS logójával (a GLS-prompt 10. pontja)
    expect(haz.teljesitesek[0]).toMatchObject({
      szallito: "gls",
      hely: "GLS házhozszállítás",
      cim: "1111 Budapest, Teszt utca 1.",
      logo: "/images/gls.png",
    })
    const masik = sikeroldal(
      {
        ...foxpostRendeles,
        shipping_methods: [{ name: "Házhozszállítás", total: 3500, data: {} }],
      },
      null,
      false,
    )
    expect(masik.teljesitesek[0]).toMatchObject({ szallito: "haz" })
    expect(masik.teljesitesek[0].logo).toBeUndefined()
    expect(
      sikeroldal(boltiRendeles, null, false).teljesitesek[0].szallito,
    ).toBe("bolt")
  })

  it("nem ígér követési számot levélben", () => {
    // a vevőnek nem mondjuk ki a belső rendszer nevét (acrobot, 2026-11-02)
    expect(KOVETKEZO_LEPES).not.toMatch(/Acropora OS/)
    expect(GLS_KOVETKEZO_LEPES).not.toMatch(/Acropora OS/)
    expect(KOVETKEZO_LEPES).not.toMatch(/e-mail|levél|küldjük/i)
    expect(GLS_KOVETKEZO_LEPES).not.toMatch(/e-mail|levél|küldjük/i)
    expect(GLS_KOVETKEZO_LEPES).toContain(
      "A GLS követési szám akkor jelenik meg",
    )
  })

  it("a GLS-pont a fajtájával, logójával és a nyitvatartással a cím mellett", () => {
    const pont = (type?: string) =>
      sikeroldal(
        {
          ...foxpostRendeles,
          shipping_methods: [
            {
              name: "GLS csomagpont",
              total: 1490,
              data: {
                gls_pickup_point: {
                  id: "L1",
                  name: "GLS Automata – Allee",
                  address: "1117 Budapest, Október huszonharmadika utca 8–10.",
                  ...(type ? { type } : {}),
                  hours: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
                    day,
                    from: "00:00",
                    to: "24:00",
                  })),
                },
              },
            },
          ],
        },
        null,
        false,
      ).teljesitesek[0]
    expect(pont("parcel-locker")).toMatchObject({
      szallito: "gls",
      tipus: "GLS Automata",
      cim: "1117 Budapest, Október huszonharmadika utca 8–10. · 0–24",
      logo: "/images/gls-automata.png",
    })
    expect(pont("parcel-shop")).toMatchObject({
      tipus: "GLS ParcelShop",
      logo: "/images/gls-csomagpont.png",
    })
    // egy fajta nélkül mentett régi pont: a régi felirat, a Csomagpont-logó
    expect(pont()).toMatchObject({
      tipus: "GLS csomagpont",
      logo: "/images/gls-csomagpont.png",
    })
  })
})

/**
 * A KÉT HELYEN ÁLLÓ MONDATOK: a konstans (a régi hívóknak) és a szótár (az oldal
 * ezt írja ki) betű szerint egyezik; a fizetés felirata és a teljesítés címkéje
 * a lap nyelvén áll.
 */
describe("a visszaigazoló oldal szövegei nyelvenként", () => {
  it("a magyar szótár betű szerint a konstans mondata", () => {
    const hu = translator("hu")
    expect(hu("orderConfirmed.nextStep")).toBe(KOVETKEZO_LEPES)
    expect(hu("orderConfirmed.nextStepGls")).toBe(GLS_KOVETKEZO_LEPES)
  })

  it("a fizetés felirata és a teljesítés címkéje angolul", () => {
    const en = translator("en")
    const stripe = {
      id: "o",
      payment_collections: [
        { payments: [{ provider_id: "pp_stripe_stripe" }] },
      ],
    }
    expect(fizetesCimke(stripe, en)).toBe("Card")
    expect(fizetesCimke(stripe)).toBe("Bankkártya")
    const lap = sikeroldal(
      { id: "o", display_id: 5, shipping_methods: [{ name: "GLS házhoz" }] },
      null,
      false,
      en,
    )
    expect(lap.teljesitesek[0].cimke).toBe("1. Order to be delivered")
  })
})

/**
 * A SZÁLLÍTÁSI DÍJ AZ ÖSSZES SZÁLLÍTÁSI MÓDBÓL (Balázs 390-es előnézeti képe
 * alapján, acrobot 40313/40461). MI PIROSÍT: ha egy rendelésnél, ahol a GLS
 * 4 500 Ft-os módja mellett van egy 0 Ft-os is, a lap „Ingyenes”-t (0) mutatna,
 * miközben a végösszeg a 4 500-at tartalmazza; ha az összeg több módnál nem az
 * összes mód összege; ha az egy módú rendelés díja változna.
 */
describe("a szállítási díj az összes szállítási módból áll", () => {
  const rendeles = (modok: { name: string; total: number }[]) => ({
    id: "order_90",
    display_id: 90,
    email: "vevo@example.test",
    total: 13500,
    items: [{ id: "i1", product_title: "Aqua Medic Reef Salt", quantity: 2 }],
    shipping_address: {
      postal_code: "1111",
      city: "Budapest",
      address_1: "Minta utca 12.",
    },
    shipping_methods: modok,
    payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe" }] }],
  })

  it("GLS 4 500 Ft és egy 0 Ft-os mód: a díj 4 500, nem a 0 Ft-os utolsó mód", () => {
    const lap = sikeroldal(
      rendeles([
        { name: "GLS házhozszállítás", total: 4500 },
        { name: "Kezelés", total: 0 },
      ]),
      null,
      false,
    )
    expect(lap.teljesitesek[0]!.szallitasiDij).toBe(4500)
  })

  it("a mód összege a `total`, ennek hiányában az `amount`; több mód összege összeadódik", () => {
    const lap = sikeroldal(
      {
        ...rendeles([]),
        shipping_methods: [
          { name: "GLS házhozszállítás", amount: 3000 },
          { name: "Felár", total: 1500 },
        ],
      },
      null,
      false,
    )
    expect(lap.teljesitesek[0]!.szallitasiDij).toBe(4500)
  })

  it("egy módnál a díj változatlan, szállítási mód nélkül 0", () => {
    expect(
      sikeroldal(
        rendeles([{ name: "GLS házhozszállítás", total: 3500 }]),
        null,
        false,
      ).teljesitesek[0]!.szallitasiDij,
    ).toBe(3500)
    expect(
      sikeroldal(rendeles([]), null, false).teljesitesek[0]!.szallitasiDij,
    ).toBe(0)
  })
})

describe("a szállítás típusa és helye a díjat hordozó módból jön", () => {
  const rendeles = (modok: object[]) => ({
    id: "order_91",
    display_id: 91,
    email: "vevo@example.test",
    total: 5650,
    items: [{ id: "i1", product_title: "Aqua Medic Reef Salt", quantity: 1 }],
    shipping_address: {
      postal_code: "1111",
      city: "Budapest",
      address_1: "Minta utca 12.",
    },
    shipping_methods: modok,
    payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe" }] }],
  })

  it("GLS házhozszállítás 4 500 Ft és egy mögé került 0 Ft-os mód: GLS marad a típus", () => {
    const t = sikeroldal(
      rendeles([
        { name: "GLS házhozszállítás", total: 4500 },
        { name: "Másik mód", total: 0 },
      ]),
      null,
      false,
    ).teljesitesek[0]!
    expect(t.szallito).toBe("gls")
    expect(t.hely).toBe("GLS házhozszállítás")
    expect(t.szallitasiDij).toBe(4500)
  })

  it("a 0 Ft-os, korábban választott Foxpost-pont nem írja felül a fizetős GLS módot", () => {
    const t = sikeroldal(
      rendeles([
        {
          name: "Foxpost csomagautomata",
          total: 0,
          data: {
            foxpost_pickup_point: { name: "Régi automata", variant: "apm" },
          },
        },
        { name: "GLS házhozszállítás", total: 4500 },
      ]),
      null,
      false,
    ).teljesitesek[0]!
    expect(t.szallito).toBe("gls")
    expect(t.hely).toBe("GLS házhozszállítás")
  })

  it("a díjas pontos mód mellett a mögé kerülő 0 Ft-os mód nem viszi el a pontot", () => {
    const t = sikeroldal(
      rendeles([
        {
          name: "Foxpost csomagautomata",
          total: 1150,
          data: {
            foxpost_pickup_point: { name: "Minta automata", variant: "apm" },
          },
        },
        { name: "Másik mód", total: 0 },
      ]),
      null,
      false,
    ).teljesitesek[0]!
    expect(t.szallito).toBe("foxpost")
    expect(t.hely).toBe("Minta automata")
  })
})
