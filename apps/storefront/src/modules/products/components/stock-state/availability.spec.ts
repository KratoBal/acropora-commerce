import { describe, expect, it } from "vitest"

import {
  availabilityLabel,
  availabilityOf,
  SIMILAR_ITEMS_LABEL,
  similarItemsHref,
  SOLD_OUT_EXPLANATION,
  UNIQUE_PIECE_PROMISE,
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
/**
 * A HAROM FELIRAT KULONBOZZON EGYMASTOL.
 *
 * Nem tautologia: azt allitja, hogy a harom allapot a VEVO SZAMARA is
 * megkulonboztetheto. Ha ketto kozuluk ugyanazt a szoveget kapna (peldaul mert
 * valaki visszairja az "Elfogyott" szot az "Eladva" melle), a lapon ket
 * kulonbozo allapot ugyanugy nezne ki -- es pontosan ez az osszemosas az, ami
 * ellen az egesz szelet keszult.
 *
 * A szo maga dontesbol jon (efb09c9a kartya, Balazs szava): "Nincs raktaron",
 * nem "Elfogyott". Az elso allapot, a masodik veg.
 */
/**
 * A MERT NULLA ES A HIANYZO SZAM KET KULONBOZO ALLAPOT.
 *
 * Merve a stage boltban (acrobot, 2026-09-07): a negy WYSIWYG termekbol
 * HAROMNAK egyetlen keszlet-sora sincs, es csak a negyediknel all kimondott
 * nulla. Balazs szabalya a MERT nullara szol; egy soha nem mert termeket
 * eladottnak nyilvanitani a HANGOS tevedes.
 */
describe("a mért nulla és a hiányzó szám", () => {
  it("kimondott jelző MÉRT nulla mellett ELADVA", () => {
    expect(
      availabilityOf({
        inStock: false,
        uniquePiece: true,
        inventoryKnown: true,
      }),
    ).toBe("ELADVA")
  })

  it("ismeretlen készlet mellett ELFOGYOTT, akkor is, ha a jelző ott van", () => {
    expect(
      availabilityOf({
        inStock: false,
        uniquePiece: true,
        inventoryKnown: false,
      }),
    ).toBe("ELFOGYOTT")
  })

  /**
   * ES A REGI HIVOK VISELKEDESE NEM VALTOZIK: a mezo elhagyasa ugyanazt adja,
   * mint a `true`. Enelkul egy uj mezo CSENDBEN atirna minden meglevo hivast.
   */
  it("a mező elhagyása a mért nullával egyenértékű", () => {
    expect(availabilityOf({ inStock: false, uniquePiece: true })).toBe("ELADVA")
  })
})

describe("a három állapot felirata", () => {
  it("mindhárom felirat különbözik", () => {
    const feliratok = Object.values(availabilityLabel)
    expect(new Set(feliratok).size).toBe(feliratok.length)
  })

  it("a nem-végleges eset ÁLLAPOTOT mond, nem véget", () => {
    expect(availabilityLabel.ELFOGYOTT).toBe("Nincs raktáron")
    expect(availabilityLabel.ELADVA).toBe("Nem elérhető")
  })
})

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

/**
 * A VEVONEK SZANT SZOVEGEK, ES A KET KOTOJEL TILALMA.
 *
 * A latvanyterv mindket mondatban ket kotojelet hasznal elvalasztojelkent. A
 * magyar szedesben ez nem helyes alak, es a LAPON LATSZIK -- vagyis nem
 * stiluskerdes, hanem a vevo ele kerulo hiba.
 *
 * Az allitas a MINTARA megy, nem a teljes mondatra: igy egy kesobbi
 * atfogalmazas nem doronti el, egy visszacsuszott kotojel viszont igen.
 */
describe("a vevőnek szánt szövegek", () => {
  it("megjelenik az Eladva magyarázata és a WYSIWYG-ígéret", () => {
    expect(SOLD_OUT_EXPLANATION.startsWith("Egyedi példány")).toBe(true)

    /**
     * ES A MULT IDEJU ALAK KIFEJEZETTEN TILOS. Enelkul a fenti allitas egy
     * visszairt "Egyedi darab volt..." mellett is zold maradna, ha valaki csak
     * a kezdetet igazitja.
     */
    /**
     * CSAK A MULT IDEJU ALAK TILOS -- ES EZ SZUKITES A KORABBIHOZ KEPEST.
     *
     * Elsore a "vissza raktárra" reszt IS tiltottam. Az TUL TAG volt: a regi
     * mondatban nem AZ volt a hibas, hanem a "volt". A "Nem kerul vissza
     * raktarra" a termek TERMESZETEROL szol (egy konkret peldany nem
     * potolhato), nem egy vasarlasrol -- tehat tiltani nem kellett volna.
     *
     * Egy szuro ara az, amit ELVESZ: ez a tiltas egy IGAZ es hasznos mondatot
     * vett volna el, egyetlen valodi hiba miatt, ami mellette allt.
     */
    expect(SOLD_OUT_EXPLANATION).not.toContain("volt")

    /**
     * ES A MASODIK MONDAT IS ROGZITVE VAN -- ezt a KALIBRACIO hivta elo.
     *
     * Amikor a masodik mondatot lecsereltem, NULLA allitas pirosodott: a
     * szovege sehol nem volt megnevezve. Pedig epp ez a mondat volt haromszor
     * vita targya, es acrobot kifejezetten ezt kerte megtartani.
     *
     * A tiltas (a mult ido) es a rogzites (a megtartando mondat) KET KULON
     * kerdes: az elso azt vedi, hogy ne allitsunk valotlant, a masodik azt,
     * hogy egy dontesbol szuletett mondat ne tunjon el csendben.
     */
    expect(SOLD_OUT_EXPLANATION).toContain("Nem kerül vissza raktárra")
    expect(UNIQUE_PIECE_PROMISE.startsWith("A fotó pontosan ezt")).toBe(true)
  })

  it("nincs két kötőjel a vevőnek szánt szövegekben", () => {
    for (const szoveg of [
      SOLD_OUT_EXPLANATION,
      UNIQUE_PIECE_PROMISE,
      SIMILAR_ITEMS_LABEL,
      ...Object.values(availabilityLabel),
    ]) {
      expect(szoveg).not.toContain("--")
    }
  })
})
