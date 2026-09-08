import { describe, expect, it } from "vitest"

import {
  canIncreaseOrderQuantity,
  maximumOrderQuantity,
  minimumOrderQuantity,
  normaliseOrderQuantity,
  orderQuantityHint,
  orderQuantityStep,
} from "./minimum-order-quantity"

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
   * A HIÁNY A GYAKORI ESET, NEM A KIVÉTEL: a 2026-09-02-i UNAS exportban 1877
   * termék nem hoz értelmes minimumot, és mindegyiknek 1-et kell adnia.
   *
   * A FORRÁS ÉS A DÁTUM AZÉRT ÁLL ITT IS, holott a fájl fejlécében is szerepel:
   * a fejléc a legelső `describe` ELŐTT van, tehát ez a szám nem hatókörből
   * örökölte az attribúciót, hanem abból, hogy VÉLETLENÜL az volt a
   * legközelebbi szöveg. A fájlban öt `describe` áll; egy új blokk közéjük, vagy
   * a sorrend átrendezése elvinné a szomszédot anélkül, hogy ez a mondat
   * megmozdulna.
   *
   * (Nautilus mérése, 2026-09-08. Én korábban azt írtam, hogy a `describe`
   * fejléce adja az öröklést -- az téves volt: a fejléc nem a blokkon BELÜL
   * áll. A javítás ezért nem a fejlécet mozgatja, hanem a számot teszi
   * önállóvá.)
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

const meta = (mezok: Record<string, unknown>) => ({ metadata: mezok }) as never

/**
 * A VALOS ERTEKEK a teszt bolt 1492 termekerol jonnek (2026-09-08, a Store
 * API-n vegiglapozva): tizenot termek visel lepeskoz-kulcsot, ebbol
 * tizenkettonel nagyobb egynel, es negy termek visel maximumot.
 *
 *   min 10 / lepes 10                6 termek
 *   min 100 / lepes 100 / max 1000   3 termek
 *   min 100 / lepes 100              2 termek
 *   min 10 / lepes 10 / max 100      1 termek
 *
 * A POPULACIO A SZAM MELLE TARTOZIK: ez a teszt bolt halmaza, nem a teljes
 * 1896-os katalogus es nem az UNAS export. A minimumrol ugyanezert all ket
 * kulonbozo szam a modul fejleceben.
 */
describe("lépésköz és rendelési maximum a metaadatból", () => {
  it("a valós értékeket sztringből olvassa", () => {
    expect(orderQuantityStep(meta({ unas_order_quantity_step: "10" }))).toBe(10)
    expect(orderQuantityStep(meta({ unas_order_quantity_step: "100" }))).toBe(
      100,
    )
    expect(
      maximumOrderQuantity(meta({ unas_maximum_order_quantity: "1000" })),
    ).toBe(1000)
  })

  /**
   * A KET VISSZAESES IRANYA KULONBOZO, ES EZ NEM RESZLETKERDES.
   *
   * Hianyzo lepeskoznel az 1 a helyes: minden mennyiseg elerheto marad.
   * Hianyzo maximumnal a `null` a helyes, mert a 0 vagy a vegtelen mast
   * jelentene -- a `null` az, hogy NINCS ILYEN KORLAT.
   */
  it("hiányzó vagy értelmezhetetlen értéknél a biztonságos irányba esik", () => {
    expect(orderQuantityStep(meta({}))).toBe(1)
    expect(orderQuantityStep(null)).toBe(1)
    expect(orderQuantityStep(meta({ unas_order_quantity_step: "0" }))).toBe(1)
    expect(orderQuantityStep(meta({ unas_order_quantity_step: "2.5" }))).toBe(1)
    expect(orderQuantityStep(meta({ unas_order_quantity_step: "tíz" }))).toBe(1)

    expect(maximumOrderQuantity(meta({}))).toBeNull()
    expect(maximumOrderQuantity(null)).toBeNull()
    expect(
      maximumOrderQuantity(meta({ unas_maximum_order_quantity: "0" })),
    ).toBeNull()
    expect(
      maximumOrderQuantity(meta({ unas_maximum_order_quantity: "sok" })),
    ).toBeNull()
  })

  /** A HAROM KULCS KULON MEZO: az egyik hianya ne olvassa a masikat. */
  it("a három kulcs nem keveredik", () => {
    const termek = meta({
      unas_minimum_order_quantity: "10",
      unas_order_quantity_step: "5",
      unas_maximum_order_quantity: "50",
    })

    expect(minimumOrderQuantity(termek)).toBe(10)
    expect(orderQuantityStep(termek)).toBe(5)
    expect(maximumOrderQuantity(termek)).toBe(50)
  })
})

describe("a rendelhető mennyiség normalizálása", () => {
  const alap = {
    minimum: 1,
    step: 1,
    orderMaximum: null,
    stockMaximum: null,
  }

  /** ISMERT POZITIV KONTROLL: lepeskoz es maximum nelkul a mai viselkedes. */
  it("lépésköz és maximum nélkül a mai viselkedés változatlan", () => {
    expect(normaliseOrderQuantity({ ...alap, value: 7 })).toBe(7)
    expect(normaliseOrderQuantity({ ...alap, value: 0 })).toBe(1)
    expect(normaliseOrderQuantity({ ...alap, value: 2.5 })).toBe(1)
    expect(
      normaliseOrderQuantity({ ...alap, value: 20, stockMaximum: 12 }),
    ).toBe(12)
  })

  it("rácsra igazít LEFELÉ, sosem fölfelé", () => {
    const t = { ...alap, minimum: 10, step: 10 }

    expect(normaliseOrderQuantity({ ...t, value: 10 })).toBe(10)
    expect(normaliseOrderQuantity({ ...t, value: 12 })).toBe(10)
    expect(normaliseOrderQuantity({ ...t, value: 19 })).toBe(10)
    expect(normaliseOrderQuantity({ ...t, value: 20 })).toBe(20)
  })

  /**
   * A RACS A MINIMUMTOL INDUL. A tobbszoros-olvasat itt 5-ot adna a 3-ra,
   * vagyis a MINIMUM FOLE emelne egy olyan erteket, amit a vevo nem kert.
   */
  it("ütköző minimum és lépésköz mellett a minimum a kiindulópont", () => {
    const t = { ...alap, minimum: 3, step: 5 }

    expect(normaliseOrderQuantity({ ...t, value: 3 })).toBe(3)
    expect(normaliseOrderQuantity({ ...t, value: 7 })).toBe(3)
    expect(normaliseOrderQuantity({ ...t, value: 8 })).toBe(8)
  })

  it("a rendelési maximum és a készlet közül a szűkebb nyer", () => {
    const t = { ...alap, minimum: 10, step: 10 }

    expect(
      normaliseOrderQuantity({
        ...t,
        value: 100,
        orderMaximum: 100,
        stockMaximum: 35,
      }),
    ).toBe(30)
    expect(
      normaliseOrderQuantity({
        ...t,
        value: 100,
        orderMaximum: 25,
        stockMaximum: 100,
      }),
    ).toBe(20)
  })

  /**
   * AZ ALSO HATAR NYER, ha a ketto nem teljesitheto egyszerre. Ez az eredeti
   * kod dontese, es megmarad: a minimum megsertese HIBAS RENDELEST ad, a felso
   * hatare csak utanrendelest. A mai adatban a rendelesi maximum SOHA nincs a
   * minimum alatt, tehat ezt az agat csak szandekos fixtura meri.
   */
  it("a minimum alá eső felső határnál a minimum nyer", () => {
    /**
     * A BEMENET SZANDEKOSAN 300, NEM 100 -- ES EZT A KALIBRACIO DERITETTE KI.
     *
     * Az elso valtozat `value: 100` volt, es a maximumot FIGYELMEN KIVUL HAGYO
     * rontasnal ZOLD MARADT: maximum nelkul a 100 ugyanugy 100 marad. Vagyis
     * nem azt merte, hogy az also hatar nyer, hanem semmit.
     *
     * 300-zal a ket olvasat SZETVALIK: a maximumot figyelmen kivul hagyo kod
     * 300-at adna, a helyes 100-at.
     */
    expect(
      normaliseOrderQuantity({
        ...alap,
        value: 300,
        minimum: 100,
        step: 100,
        orderMaximum: 50,
        stockMaximum: null,
      }),
    ).toBe(100)
  })
})

/**
 * A NOVELHETOSEG NEM A `>=` KERDESE, es ez a resz konnyen tunik feleslegesnek.
 * Tizes lepeskoznel es tizenot darabos keszletnel a `10 >= 15` HAMIS, tehat a
 * regi feltetel aktivan hagyta volna a gombot -- ami aztan nem csinal semmit.
 */
describe("a plusz gomb feltétele", () => {
  it("akkor és csak akkor engedélyez, ha egy lépés változtat", () => {
    const t = {
      minimum: 10,
      step: 10,
      orderMaximum: null,
      stockMaximum: 15,
    }

    expect(canIncreaseOrderQuantity({ ...t, quantity: 10 })).toBe(false)
    expect(
      canIncreaseOrderQuantity({ ...t, quantity: 10, stockMaximum: 25 }),
    ).toBe(true)
  })

  it("korlát nélkül mindig engedélyez", () => {
    expect(
      canIncreaseOrderQuantity({
        quantity: 1,
        minimum: 1,
        step: 1,
        orderMaximum: null,
        stockMaximum: null,
      }),
    ).toBe(true)
  })
})

/**
 * A MONDAT NEGY ALAKJA. A `join`-os osszefuzes a masodik esetnel nyelvtanilag
 * hibas mondatot adott volna ("Ebbol a termekbol es 5 darabonkent novelheto"),
 * ezert all negy kulon ag a fuggvenyben.
 */
describe("a léptető alatti mondat", () => {
  it("hallgat, ha nincs mit mondania", () => {
    expect(
      orderQuantityHint({ minimum: 1, step: 1, orderMaximum: null }),
    ).toBeNull()
  })

  it("csak minimum", () => {
    expect(
      orderQuantityHint({ minimum: 10, step: 1, orderMaximum: null }),
    ).toBe("Ebből a termékből legalább 10 darab rendelhető.")
  })

  it("csak lépésköz", () => {
    expect(orderQuantityHint({ minimum: 1, step: 5, orderMaximum: null })).toBe(
      "Ebből a termékből 5 darabonként rendelhető.",
    )
  })

  it("minimum és lépésköz együtt: a valós eset", () => {
    expect(
      orderQuantityHint({ minimum: 10, step: 10, orderMaximum: null }),
    ).toBe(
      "Ebből a termékből legalább 10 darab rendelhető, és 10 darabonként növelhető.",
    )
  })

  it("maximummal együtt", () => {
    expect(
      orderQuantityHint({ minimum: 100, step: 100, orderMaximum: 1000 }),
    ).toBe(
      "Ebből a termékből legalább 100 darab rendelhető, és 100 darabonként növelhető, de legfeljebb 1000 darab rendelhető.",
    )
  })

  it("csak maximum", () => {
    expect(orderQuantityHint({ minimum: 1, step: 1, orderMaximum: 50 })).toBe(
      "Ebből a termékből legfeljebb 50 darab rendelhető.",
    )
  })
})
