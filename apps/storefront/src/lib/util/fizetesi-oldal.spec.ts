import { describe, expect, it } from "vitest"

import {
  rendelesiAdatok,
  szallitasiCsoportok,
  tetelSor,
} from "./fizetesi-oldal"

/**
 * A FIZETESI OLDAL ADATAI (Figma 209:3). MI PIROSIT: ha a nev a Figmaval
 * ellentetes sorrendben all; ha a ceges szamlazasnal nem a cegnev latszik; ha
 * a vegyes kosar elo allatos resze nem kulon, szemelyes atveteles csoport; ha
 * a csomagpontos mod a hazcimet mutatja a pont helyett; ha kitalalt csoport
 * jelenik meg (a Figma "Normál / Nagyméretű" csoportjai nalunk nem leteznek).
 */
const cim = {
  first_name: "Balázs",
  last_name: "Kratochwill",
  phone: "+36 20 123 4567",
  postal_code: "1111",
  city: "Budapest",
  address_1: "Minta utca 12.",
}

describe("a rendelési adatok", () => {
  it("a Figma sorrendjében, a cégnévvel ha van", () => {
    expect(
      rendelesiAdatok({
        email: "balazs@example.hu",
        shipping_address: cim,
        billing_address: { ...cim, company: "Acropora Kft." },
      }),
    ).toEqual({
      kapcsolat: {
        nev: "Balázs Kratochwill",
        elerhetoseg: "balazs@example.hu · +36 20 123 4567",
      },
      szamlazas: { nev: "Acropora Kft.", cim: "1111 Budapest, Minta utca 12." },
    })
  })

  it("külön számlázási cím nélkül a szállítási a számlázási", () => {
    expect(
      rendelesiAdatok({ email: "x@y.z", shipping_address: cim }).szamlazas.nev,
    ).toBe("Balázs Kratochwill")
  })
})

describe("a szállítási csoportok", () => {
  const items = [
    { id: "i1", product_title: "Reef LED 160 Pro", quantity: 1, total: 289900 },
    {
      id: "i2",
      product_title: "Aquaforest Reef Salt",
      quantity: 2,
      total: 69800,
    },
    {
      id: "i3",
      product_title: "Acropora tenuis „Miami Vice”",
      quantity: 1,
      total: 24900,
    },
  ]

  it("a csomagpontos mód a pontot mutatja, nem a házcímet", () => {
    const [cs] = szallitasiCsoportok(
      {
        items: items.slice(0, 2),
        shipping_address: cim,
        shipping_methods: [
          {
            name: "Foxpost csomagpont",
            total: 1490,
            data: {
              foxpost_pickup_point: {
                id: "hu04",
                name: "FOXPOST A-BOX Budagyöngye",
                address: "1026 Budapest, Szilágyi E. fasor 121.",
              },
            },
          },
        ],
      },
      new Set(),
    )
    expect(cs).toEqual({
      cimke: "1. Kiszállítás",
      mod: "Foxpost csomagpont",
      osszeg: 1490,
      tetelek: ["Reef LED 160 Pro", "Aquaforest Reef Salt × 2"],
      hova: "FOXPOST A-BOX Budagyöngye · 1026 Budapest, Szilágyi E. fasor 121.",
    })
  })

  it("vegyes kosárnál az élő állat külön, személyes átvétellel, a bolt címével", () => {
    const csoportok = szallitasiCsoportok(
      {
        items,
        shipping_address: cim,
        shipping_methods: [
          { name: "GLS házhozszállítás", amount: 2490, data: {} },
        ],
      },
      new Set(["i3"]),
    )
    expect(
      csoportok.map((c) => [
        c.cimke,
        c.mod,
        c.osszeg,
        c.tetelek.join(" + "),
        c.hova,
      ]),
    ).toEqual([
      [
        "1. Kiszállítás",
        "GLS házhozszállítás",
        2490,
        "Reef LED 160 Pro + Aquaforest Reef Salt × 2",
        "1111 Budapest, Minta utca 12.",
      ],
      [
        "2. Élőállat",
        "Személyes átvétel",
        0,
        "Acropora tenuis „Miami Vice”",
        "1106 Budapest, Pesti Gábor utca 35",
      ],
    ])
  })

  it("szállítási mód nélkül nincs kitalált csoport", () => {
    expect(
      szallitasiCsoportok(
        { items: items.slice(0, 1), shipping_methods: [] },
        new Set(),
      ),
    ).toEqual([])
  })

  it("a tétel sora a darabszámot csak egynél többnél írja", () => {
    expect(tetelSor({ id: "a", title: "Só", quantity: 1 })).toBe("Só")
    expect(tetelSor({ id: "a", title: "Só", quantity: 3 })).toBe("Só × 3")
  })
})
