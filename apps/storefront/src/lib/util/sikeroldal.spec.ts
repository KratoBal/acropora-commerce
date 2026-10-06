import { describe, expect, it } from "vitest"

import { GLS_KOVETKEZO_LEPES, KOVETKEZO_LEPES, sikeroldal } from "./sikeroldal"

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
