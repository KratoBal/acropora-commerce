import { describe, expect, it } from "vitest"

import {
  categoryPageKind,
  categoryPageMode,
} from "@modules/categories/templates/category-page-data"

import { kategoriaFelmenoi, teljesLanc } from "./kategoria-fa"

/**
 * A KATEGORIA FELMENOI A TELJES LISTABOL (2026-09-29).
 *
 * A stage mai fajanak egy darabja: a "SPS - WYSIWYG" korall-kategoria harom
 * szint mely, es a bolt API csak egy szulot adott hozza. MI PIROSIT: ha a lanc
 * nem ér el a gyokerig; ha egy ciklus vegtelen ciklust ad; ha egy hianyzo elem
 * utan kitalalt elem all; ha a mely korall nem elo allatnak, nem Reefnek
 * sorolodik a teljes lanccal.
 */
const LISTA = [
  { id: "kor", name: "Korallok", handle: "korallok", parent_category_id: null },
  {
    id: "sps",
    name: "SPS - Korallok",
    handle: "sps---korallok",
    parent_category_id: "kor",
  },
  {
    id: "wys",
    name: "SPS - WYSIWYG",
    handle: "sps---wysiwyg",
    parent_category_id: "sps",
  },
]

describe("a kategória felmenői", () => {
  it("a gyökértől a szülőig, a kategória nélkül", () => {
    expect(kategoriaFelmenoi("wys", LISTA).map((f) => f.id)).toEqual([
      "kor",
      "sps",
    ])
    expect(kategoriaFelmenoi("kor", LISTA)).toEqual([])
  })

  it("ismeretlen kategóriánál üres, hiányzó felmenőnél ott megáll", () => {
    expect(kategoriaFelmenoi("nincs", LISTA)).toEqual([])
    const lyukas = LISTA.filter((k) => k.id !== "kor")
    expect(kategoriaFelmenoi("wys", lyukas).map((f) => f.id)).toEqual(["sps"])
  })

  it("handle vagy név nélküli felmenőnél a lánc ott megáll (halott link helyett)", () => {
    const handleNelkul = LISTA.map((k) =>
      k.id === "sps" ? { ...k, handle: null } : k,
    )
    expect(kategoriaFelmenoi("wys", handleNelkul)).toEqual([])
    const nevNelkul = LISTA.map((k) =>
      k.id === "sps" ? { ...k, name: "" } : k,
    )
    expect(kategoriaFelmenoi("wys", nevNelkul)).toEqual([])
  })

  it("a ciklus nem végtelen", () => {
    const kor = [
      { id: "a", name: "A", handle: "a", parent_category_id: "b" },
      { id: "b", name: "B", handle: "b", parent_category_id: "a" },
    ]
    expect(kategoriaFelmenoi("a", kor).map((f) => f.id)).toEqual(["b"])
  })

  it("a teljes lánc a parent_category mezőn a gyökérig ér", () => {
    const kat = teljesLanc(
      { id: "wys", name: "SPS - WYSIWYG" },
      kategoriaFelmenoi("wys", LISTA),
    ) as { parent_category?: { id: string; parent_category?: { id: string } } }
    expect(kat.parent_category?.id).toBe("sps")
    expect(kat.parent_category?.parent_category?.id).toBe("kor")
  })

  it("a mély korall a teljes lánccal élő állat és Reef, nélküle nem", () => {
    const csonka = {
      name: "SPS - WYSIWYG",
      parent_category: { name: "SPS - Korallok" },
    }
    // ISMERT NEGATIV KONTROLL: a bolt mai, egyszintes valaszaval ez a hiba.
    expect(categoryPageKind(csonka)).toBe("technical")

    const teljes = teljesLanc(csonka, kategoriaFelmenoi("wys", LISTA))
    expect(categoryPageKind(teljes)).toBe("livestock")
    expect(categoryPageMode(teljes)).toBe("reef")
  })
})
