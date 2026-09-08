import { describe, expect, it } from "vitest"

import {
  HASONLO_KULCS,
  KAPCSOLAT_HATAR,
  KIEGESZITO_KULCS,
  hasonloAzonositok,
  kertSorrendben,
  kiegeszitoAzonositok,
} from "./gondozott-kapcsolatok"

describe("a gondozott kapcsolatok olvasasa", () => {
  /**
   * A LEGFONTOSABB ALLITAS, ES TAGADO.
   *
   * A valtozas lenyege nem az, hogy a doboz mit MUTAT, hanem hogy mikor NEM
   * mutat semmit. Enelkul visszakuszhat a mai allapot: egy ures szuro NEM
   * szur, tehat a lekerdezes ujra a katalogus elejet adna vissza, es a doboz
   * ugyanugy "mukodne".
   */
  it("metaadat nélkül NINCS azonosító, tehát nem indul lekérdezés", () => {
    expect(hasonloAzonositok(null)).toEqual([])
    expect(hasonloAzonositok(undefined)).toEqual([])
    expect(hasonloAzonositok({})).toEqual([])
    expect(hasonloAzonositok({ [HASONLO_KULCS]: "" })).toEqual([])
    expect(hasonloAzonositok({ [HASONLO_KULCS]: "  ,  , " })).toEqual([])
  })

  /**
   * A metaadat erteke a Medusaban SZTRING. Egy nem-sztring ertek (szam,
   * objektum, tomb) nem hiba, hanem MAS adat -- es nem szabad belole
   * azonositot gyartani.
   */
  it("nem sztring érték esetén üres, nem próbál értelmezni", () => {
    expect(hasonloAzonositok({ [HASONLO_KULCS]: 42 })).toEqual([])
    expect(hasonloAzonositok({ [HASONLO_KULCS]: ["a", "b"] })).toEqual([])
  })

  it("kiolvassa és tisztítja az azonosítókat", () => {
    expect(
      hasonloAzonositok({
        [HASONLO_KULCS]: " prod_1 ,prod_2,, prod_1 ,prod_3",
      }),
    ).toEqual(["prod_1", "prod_2", "prod_3"])
  })

  /**
   * A HATAR AZ OLVASO OLDALON IS ALL. Ha az iro oldal valaha tobbet tenne bele,
   * a kirakat akkor sem visz tobbet a lekerdezesbe -- a `metadata` MINDEN
   * termek-valaszon utazik, a listakon is.
   */
  it("legfeljebb tizenkét azonosítót ad vissza", () => {
    const sok = Array.from({ length: 30 }, (_, i) => `prod_${i}`).join(",")
    const ki = hasonloAzonositok({ [HASONLO_KULCS]: sok })

    expect(ki).toHaveLength(KAPCSOLAT_HATAR)
    expect(ki[0]).toBe("prod_0")
    expect(ki[KAPCSOLAT_HATAR - 1]).toBe(`prod_${KAPCSOLAT_HATAR - 1}`)
  })
})

describe("a kért sorrend helyreállítása", () => {
  /**
   * MERVE A BOLT VEGPONTJAN (acrobot, msg_id 14892): a tobbertekes `id` szuro
   * MINDET visszaadja, de a valasz SORRENDJE FUGGETLEN a kert sorrendtol.
   *
   * Ha ez a lepes kimarad, a doboz MUKODIK, csak mas sorrendben -- es senki nem
   * veszi eszre. Ezert all ra kulon allitas: a bemenet SZANDEKOSAN mas
   * sorrendben all, mint a kert lista.
   */
  it("a kért sorrendbe rendez, akkor is, ha a válasz mást ad", () => {
    const valasz = [
      { id: "prod_3", title: "harmadik" },
      { id: "prod_1", title: "elso" },
      { id: "prod_2", title: "masodik" },
    ]

    expect(
      kertSorrendben(valasz, ["prod_1", "prod_2", "prod_3"]).map((t) => t.id),
    ).toEqual(["prod_1", "prod_2", "prod_3"])
  })

  /**
   * Ami a kert azonositok kozott nincs a valaszban (torolt vagy nem publikalt
   * termek), az KIMARAD: a lista rovidebb lesz, nem lyukas.
   */
  it("a válaszból hiányzó azonosító kimarad, nem hagy lyukat", () => {
    const valasz = [{ id: "prod_2", title: "masodik" }]

    expect(
      kertSorrendben(valasz, ["prod_1", "prod_2", "prod_3"]).map((t) => t.id),
    ).toEqual(["prod_2"])
  })

  /**
   * ES A VALASZBAN ALLO TOBBLET SEM KERUL BE. Ez nem elmeleti: egy elgepelt
   * szuro tobbet hozhat, mint amit kertunk, es akkor a doboz megint olyat
   * mutatna, amit senki nem gondozott.
   */
  it("a válaszban álló, nem kért termék nem kerül a listába", () => {
    const valasz = [
      { id: "prod_1", title: "elso" },
      { id: "prod_999", title: "kéretlen" },
    ]

    expect(kertSorrendben(valasz, ["prod_1"]).map((t) => t.id)).toEqual([
      "prod_1",
    ])
  })
})

/**
 * A KET LISTA FUGGETLENSEGE -- ES EZ AZ AZ ALLITAS, AMIERT EZ A KESZLET LETEZIK.
 *
 * A tobbi allitas azt meri, hogy a KIOLVASAS mukodik. Egyik sem tud kulonbseget
 * tenni a helyes viselkedes es az kozott, ha a ket fuggveny UGYANAZT a kulcsot
 * olvasna: akkor is kijonnenek az azonositok, csak a rossz dobozba.
 *
 * Ezert a bemenet itt olyan, ahol MINDEN MAS FELTETEL IGAZ, es csak a kulcs ter
 * el: egy termek, amin CSAK kiegeszito all, es egy masik, amin CSAK hasonlo.
 * Egy kozos bemenet (mindketto egyszerre) ezt NEM merne -- ott mindket fuggveny
 * talalna valamit akkor is, ha ugyanarra a kulcsra nez.
 */
describe("a hasonlo es a kiegeszito lista fuggetlen", () => {
  it("a két kulcs KÜLÖNBÖZŐ", () => {
    expect(KIEGESZITO_KULCS).not.toBe(HASONLO_KULCS)
  })

  it("csak kiegészítő azonosítókkal a hasonló lista ÜRES", () => {
    const metadata = { [KIEGESZITO_KULCS]: "prod_a,prod_b" }

    expect(kiegeszitoAzonositok(metadata)).toEqual(["prod_a", "prod_b"])
    expect(hasonloAzonositok(metadata)).toEqual([])
  })

  it("csak hasonló azonosítókkal a kiegészítő lista ÜRES", () => {
    const metadata = { [HASONLO_KULCS]: "prod_x,prod_y" }

    expect(hasonloAzonositok(metadata)).toEqual(["prod_x", "prod_y"])
    expect(kiegeszitoAzonositok(metadata)).toEqual([])
  })

  it("mindkettő jelen van: mindegyik a SAJÁTJÁT adja vissza", () => {
    const metadata = {
      [HASONLO_KULCS]: "prod_x,prod_y",
      [KIEGESZITO_KULCS]: "prod_a",
    }

    expect(hasonloAzonositok(metadata)).toEqual(["prod_x", "prod_y"])
    expect(kiegeszitoAzonositok(metadata)).toEqual(["prod_a"])
  })

  /**
   * A KIEGESZITO AGRA IS ALL A TISZTITAS ES A HATAR -- es ezt kulon ki kell
   * mondani, mert a ket burkolo KOZOS torzset hasznal: ha valaha szetvalna,
   * a kiegeszito ag csendben elveszitene a duplikatum-szurest es a hatart.
   */
  it("a kiegészítő ág ugyanúgy tisztít és ugyanúgy vág", () => {
    expect(
      kiegeszitoAzonositok({
        [KIEGESZITO_KULCS]: " prod_1 ,prod_2,, prod_1 ,prod_3",
      }),
    ).toEqual(["prod_1", "prod_2", "prod_3"])

    const sok = Array.from({ length: 30 }, (_, i) => `prod_${i}`).join(",")
    expect(kiegeszitoAzonositok({ [KIEGESZITO_KULCS]: sok })).toHaveLength(12)
  })
})
