import { describe, expect, it } from "vitest"

import {
  availabilityOf,
  similarItemsHref,
  uniquePieceOf,
} from "./availability"

describe("készlet-állapot", () => {
  it("készleten lévő termék KAPHATÓ", () => {
    expect(availabilityOf({ inStock: true, uniquePiece: false })).toBe("KAPHATO")
  })

  /**
   * A SORREND VÉDVE: az `inStock` ág ELŐZI az `uniquePiece` ágat.
   *
   * Egy készleten lévő egyedi példány KAPHATÓ, nem "eladva" -- épp az a lényege,
   * hogy amíg megvan, megvehető.
   */
  it("készleten lévő egyedi példány KAPHATÓ", () => {
    expect(availabilityOf({ inStock: true, uniquePiece: true })).toBe("KAPHATO")
  })

  it("elfogyott egyedi példány ELADVA", () => {
    expect(availabilityOf({ inStock: false, uniquePiece: true })).toBe("ELADVA")
  })

  /**
   * A LEGFONTOSABB ÁLLÍTÁS: a hiányzó jelző ELFOGYOTT-at ad, SOHA nem ELADVÁT.
   *
   * A jelzőt ma semmi nem küldi a boltba. A két téves állítás ára nem egyforma:
   * egy téves "elfogyott" után a vevő visszatér és csalódik; egy téves "eladva"
   * után elmegy, és nem jön vissza megnézni.
   */
  it("jelző nélkül ELFOGYOTT, soha nem ELADVA", () => {
    expect(availabilityOf({ inStock: false, uniquePiece: false })).toBe(
      "ELFOGYOTT"
    )
  })
})

/**
 * A JELZŐ OLVASÁSA -- ÉS AZ ISMERT POZITÍV KONTROLL MELLETTE.
 *
 * Egy állítás, ami CSAK azt méri, hogy a hiányzó jelző hamisat ad, akkor is zöld
 * lenne, ha a függvény MINDIG hamisat adna. Ezért áll mellette az az eset, ami
 * IGAZAT vár: az bizonyítja, hogy az olvasás egyáltalán talál valamit.
 */
describe("a WYSIWYG jelző olvasása a metaadatból", () => {
  it("a kimondott jelző igazat ad -- logikai és szöveges alakban is", () => {
    expect(uniquePieceOf({ unique_piece: true })).toBe(true)
    expect(uniquePieceOf({ unique_piece: "true" })).toBe(true)
  })

  it("a hiányzó, üres vagy tagadó jelző hamis", () => {
    expect(uniquePieceOf(undefined)).toBe(false)
    expect(uniquePieceOf(null)).toBe(false)
    expect(uniquePieceOf({})).toBe(false)
    expect(uniquePieceOf({ unique_piece: "" })).toBe(false)
    expect(uniquePieceOf({ unique_piece: "false" })).toBe(false)
    expect(uniquePieceOf({ unique_piece: 0 })).toBe(false)
  })

  /**
   * A MA MÉRT ÁLLAPOT, ÁLLÍTÁSKÉNT: a vetítés `allow_backorder`-t ír, jelzőt
   * nem. Ha valaki valaha abból akarná származtatni, ez a sor pirosodik ki.
   */
  it("az allow_backorder NEM jelző: önmagában hamisat ad", () => {
    expect(uniquePieceOf({ allow_backorder: false })).toBe(false)
  })
})

describe("a továbbvivő gomb címe", () => {
  it("a termék gyűjteményére visz, ha van", () => {
    expect(
      similarItemsHref({
        collection: { handle: "elo-korallok" },
        categories: [{ handle: "sps" }],
      }),
    ).toBe("/collections/elo-korallok")
  })

  it("gyűjtemény nélkül a kategóriára visz", () => {
    expect(similarItemsHref({ categories: [{ handle: "sps" }] })).toBe(
      "/categories/sps",
    )
  })

  /**
   * SOHA NEM VISZ HALOTT CÍMRE: ez az a tulajdonság, amiért a gomb egyáltalán
   * kirajzolható anélkül, hogy minden terméknél megnéznénk a besorolását.
   */
  it("besorolás nélkül a bolt főoldalára visz", () => {
    expect(similarItemsHref({})).toBe("/store")
    expect(similarItemsHref({ collection: null, categories: [] })).toBe("/store")
  })
})
