import { describe, expect, it } from "vitest"

import {
  PICKUP_LEAD,
  PICKUP_REASON,
  PICKUP_TITLE,
  pickupNoticeProps,
  pickupNoticeVisible,
  pickupOnlyLinesFromClass,
} from "./pickup-notice"

describe("az átvételi sáv szövege", () => {
  /**
   * A HANGNEM TENYKOZLES, NEM TILTAS. A vevo nem hibazott, amikor elo allatot
   * tett a kosarba -- egy tilto szo azt uzenne, hogy valamit rosszul csinalt.
   */
  it("nem tiltó szavakkal beszél", () => {
    const egyben = [PICKUP_TITLE, PICKUP_LEAD, PICKUP_REASON].join(" ")
    for (const tilto of ["nem lehet", "tilos", "hiba", "nem választható"]) {
      expect(egyben.toLowerCase()).not.toContain(tilto)
    }
  })

  /**
   * ES AZ INDOK OTT ALL: enelkul a korlatozas onkenyesnek latszik. Ez az
   * ismert pozitiv kontroll a fenti tagado allitas melle -- kulonben egy URES
   * szoveg is atmenne rajta.
   */
  it("megmondja, MIÉRT", () => {
    expect(PICKUP_REASON).toContain("nem adunk fel csomagként")
  })

  /**
   * A TARTALOM, AMI EGYSZER MAR KIESETT -- ES SEMMI NEM SZOLT.
   *
   * A mondat korabban a terv tomoritese volt, es a tomoritesben elveszett,
   * hogy a rendelest NEM BONTJUK KET RENDELESRE. Ez nem stilus: a vevo
   * legelso kerdese az, hogy a muszaki tetelek kulon jonnek-e postan.
   *
   * A felette allo allitas ezt NEM fogta meg, es helyesen nem: az a mondat
   * LETEZESET meri ("nem adunk fel csomagkent"), nem a TARTALMAT. A ket
   * allitas kulonbozo dolgot ved, ezert all itt mind a ketto.
   *
   * (Nautilus merese, 2026-09-08: a kosar mind a 22 ember-olvasta szoveget a
   * tervhez merte, es ez a mondat ugy jott ki, mint hianyos atvetel. A
   * mondat masik hianyzo fele -- hogy a peldanyt a vevo elott emelik ki --
   * SZANDEKOSAN nincs benne: az a bolt gyakorlatarol szolo igeret, amit a
   * kirakat nem tud garantalni.)
   */
  it("megmondja, hogy a rendelés EGYBEN marad", () => {
    expect(PICKUP_REASON).toContain("nem bontjuk két rendelésre")
    expect(PICKUP_REASON).toContain("teljes kosarat")
  })

  it("nincs két kötőjel a vevőnek szánt szövegekben", () => {
    for (const szoveg of [PICKUP_TITLE, PICKUP_LEAD, PICKUP_REASON]) {
      expect(szoveg).not.toContain("--")
    }
  })
})

/**
 * A VALODI JEL: OSZTALY PLUSZ FORRAS.
 *
 * A pozitiv kontroll ELOL all, mert a tobbi allitas azt meri, hogy valami NEM
 * kerul a listaba -- azokat egy sosem-mukodo fuggveny is kielegitene.
 */
describe("pickupOnlyLinesFromClass", () => {
  const sorok = [
    { id: "item_01", title: "Acropora tenuis" },
    { id: "item_02", title: "Tengeri só 20 kg" },
  ]

  it("megnevezi azt a sort, amelyik a korlátozást előidézte", () => {
    expect(pickupOnlyLinesFromClass("PICKUP_ONLY", "item_01", sorok)).toEqual([
      "Acropora tenuis",
    ])
  })

  /**
   * ES NEM A LISTA ELSO SORAT, NEM IS AZ OSSZESET. Ha a forras a masodik
   * sorra mutat, azt kell megneveznie -- kulonben egy "megnevezes" allna ott,
   * ami valojaban talalgatas.
   */
  it("a forrás szerinti sort nevezi meg, nem az elsőt", () => {
    expect(pickupOnlyLinesFromClass("PICKUP_ONLY", "item_02", sorok)).toEqual([
      "Tengeri só 20 kg",
    ])
  })

  it("más szállítási osztálynál nem nevez meg semmit", () => {
    expect(pickupOnlyLinesFromClass("NORMAL", "item_01", sorok)).toEqual([])
  })

  /**
   * A VEGPONT NEM VALASZOLT. Iranyaban ez a csendesebb tevedes: nem allitunk
   * korlatozast, amirol nem tudunk.
   */
  it("ismeretlen osztálynál nem nevez meg semmit", () => {
    expect(pickupOnlyLinesFromClass(null, null, sorok)).toEqual([])
    expect(pickupOnlyLinesFromClass(undefined, undefined, sorok)).toEqual([])
  })

  /**
   * A HATARESET: az osztaly PICKUP_ONLY, de a forras nem talalhato a kosarban.
   * A lista ures, es a sav lathatosagat ez NEM donti el -- azt a
   * `pickupNoticeVisible` mondja meg, kulon.
   */
  it("nem található forrásnál üres listát ad, de az osztály marad", () => {
    expect(pickupOnlyLinesFromClass("PICKUP_ONLY", "item_99", sorok)).toEqual(
      [],
    )
    expect(pickupNoticeVisible("PICKUP_ONLY")).toBe(true)
  })
})

describe("pickupNoticeVisible", () => {
  it("a bolti átvételes osztálynál igaz", () => {
    expect(pickupNoticeVisible("PICKUP_ONLY")).toBe(true)
  })

  it("minden más osztálynál hamis", () => {
    expect(pickupNoticeVisible("NORMAL")).toBe(false)
    expect(pickupNoticeVisible("HEAVY")).toBe(false)
    expect(pickupNoticeVisible("NO_FOXPOST")).toBe(false)
    expect(pickupNoticeVisible(null)).toBe(false)
    expect(pickupNoticeVisible(undefined)).toBe(false)
  })
})

/**
 * A BEKOTES MERHETO RESZE. A pozitiv eset elol: enelkul a tobbi allitas egy
 * olyan fuggvenyen is zold lenne, ami mindig ures savot ad.
 */
describe("pickupNoticeProps", () => {
  const TETELEK = [
    { id: "item_01", title: "Kicsi", product_title: "Acropora tenuis" },
    { id: "item_02", title: "20 kg", product_title: "Tengeri só" },
  ]

  it("látható sávot ad, a kiváltó tétel nevével", () => {
    expect(
      pickupNoticeProps(TETELEK, {
        shipping_class: "PICKUP_ONLY",
        shipping_class_source: "item_01",
      }),
    ).toEqual({ visible: true, lines: ["Acropora tenuis"] })
  })

  /**
   * A VALTOZAT NEVE NEM A TERMEK NEVE. Ha a lekepezes a sor `title` mezojet
   * venne, a vevo azt olvasna, hogy "Kicsi miatt" -- ami semmit nem mond.
   */
  it("a termék nevét mondja, nem a változatét", () => {
    const eredmeny = pickupNoticeProps(TETELEK, {
      shipping_class: "PICKUP_ONLY",
      shipping_class_source: "item_02",
    })

    expect(eredmeny.lines).toEqual(["Tengeri só"])
    expect(eredmeny.lines).not.toEqual(["20 kg"])
  })

  /** Ha nincs termeknev, a sor neve a tartalek -- nem ures sor. */
  it("terméknév híján a sor nevére esik vissza", () => {
    expect(
      pickupNoticeProps([{ id: "item_03", title: "Egyedi darab" }], {
        shipping_class: "PICKUP_ONLY",
        shipping_class_source: "item_03",
      }),
    ).toEqual({ visible: true, lines: ["Egyedi darab"] })
  })

  it("más osztálynál nem látszik és nem nevez meg semmit", () => {
    expect(
      pickupNoticeProps(TETELEK, {
        shipping_class: "NORMAL",
        shipping_class_source: null,
      }),
    ).toEqual({ visible: false, lines: [] })
  })

  /** A vegpont nem valaszolt: nem allitunk korlatozast, amirol nem tudunk. */
  it("hiányzó osztálynál nem látszik", () => {
    expect(pickupNoticeProps(TETELEK, null)).toEqual({
      visible: false,
      lines: [],
    })
    expect(pickupNoticeProps(TETELEK, undefined)).toEqual({
      visible: false,
      lines: [],
    })
  })

  /** A hatareset egyben: latszik, de nincs mit megnevezni. */
  it("nem található forrásnál látszik, megnevezés nélkül", () => {
    expect(
      pickupNoticeProps(TETELEK, {
        shipping_class: "PICKUP_ONLY",
        shipping_class_source: "item_99",
      }),
    ).toEqual({ visible: true, lines: [] })
  })
})
