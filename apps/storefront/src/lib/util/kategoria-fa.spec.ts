import { describe, expect, it } from "vitest"

import { gyokerekKetSzintel, megjelenitendoNevek } from "./kategoria-fa"

/**
 * A MENU PANELJENEK HAROM SZINT KELL, ES A HARMADIK KONNYEN ELMARAD.
 *
 * A csoportos panel fejlece egy kozvetlen gyerek, az elemei pedig annak a sajat
 * gyerekei. Ha a masodik szint atmegy, de a harmadik nem, a panel CSUPA FEJLEC
 * es NULLA elem lesz -- es semmi nem hibazik kozben.
 *
 * === A HELY, AHOL EZ A FUGGVENY ALL, MAGA IS MERES EREDMENYE ===
 *
 * Eloszor a `lib/data/categories.ts` fajlban allt, es a spec ELSO futasa nem
 * pirosat adott, hanem BETOLTESI hibat: "This module cannot be imported from a
 * Client Component module." Az a modul `server-only`, tehat jsdom alatt nem
 * behuzhato -- vagyis a fuggveny olyan helyen ult, ahonnan semmilyen teszt nem
 * latja. Nem a merest kellett javitani, hanem a KODOT elmozditani.
 */
const kat = (id: string, name: string, szulo?: string) =>
  ({
    id,
    name,
    handle: name.toLowerCase(),
    parent_category_id: szulo ?? null,
  }) as never

describe("a kategória-fa két szint gyereket ad át", () => {
  const mind = [
    kat("gy1", "Termékek"),
    kat("gy2", "Halak"),
    kat("k1", "Eledelek", "gy1"),
    kat("k2", "Lehabzók", "gy1"),
    kat("u1", "Haleledelek", "k1"),
    kat("u2", "Koralltápok", "k1"),
    kat("h1", "Gébek", "gy2"),
  ]

  it("csak a gyökerek jönnek vissza", () => {
    expect(gyokerekKetSzintel(mind).map((k) => k.name)).toEqual([
      "Termékek",
      "Halak",
    ])
  })

  it("a gyökér alatt a közvetlen gyerekei állnak", () => {
    const termekek = gyokerekKetSzintel(mind)[0]

    expect((termekek.category_children ?? []).map((k) => k.name)).toEqual([
      "Eledelek",
      "Lehabzók",
    ])
  })

  /**
   * EZ AZ ALLITAS A HARMADIK SZINTRE SZOL, es enelkul a panel nema modon
   * uresedne ki: a fejlecek megjelennenek, az elemek nem.
   */
  it("a gyerek alatt az UNOKAI is ott vannak", () => {
    const eledelek = (gyokerekKetSzintel(mind)[0].category_children ?? [])[0]

    expect((eledelek.category_children ?? []).map((k) => k.name)).toEqual([
      "Haleledelek",
      "Koralltápok",
    ])
  })

  /**
   * ES AZ ELLENKEZO IRANY: ahol nincs unoka, ott URES tomb all, nem hianyzo
   * mezo. A panel ebbol dont a ket alakja kozott.
   */
  it("unoka nélküli gyereknél üres lista áll, nem hiányzó mező", () => {
    const gebek = (gyokerekKetSzintel(mind)[1].category_children ?? [])[0]

    expect(gebek.category_children).toEqual([])
  })
})

/**
 * A ROVIDITES CSAK AKKOR VAG, HA A ROVID NEV EGYEDI.
 *
 * A HAROM ESET A SZABALYT MERI, NEM A MAI ADAT ALLAPOTAT -- ezert a
 * kategoria-betoltes utan is ugyanezt fogja mondani. A fixtura szandekosan
 * kicsi es szintetikus: valodi katalogusra epitve az allitas azt merne, milyen
 * a bolt MA, nem azt, mit csinal a szabaly.
 */
describe("a megjelenítendő nevek ütközés-tudatosak", () => {
  /*
    A FIXTURA A VALODI UTKOZES ALAKJAT KOVETI, ES AZ ELSO VALTOZATA NEM AZT
    KOVETTE.

    Ott a ket "utkozo" elem neve `Koralltápok - Aquaforest` volt, a SZULOJUK
    viszont a gyoker (`Termékek`). A vagas pontos egyezest keres, tehat egyik
    nev sem rovidult -- az allitas ZOLDEN allt, de nem azert, amiert irtam. A
    kalibracio fogta meg: a szabaly kivetele NULLA pirosat adott.
    (Merve 2026-09-09.)

    A valodi alak a bolt adatabol: a marka neve all elol, es UGYANAZ a marka
    tobb szulo alatt is szerepel. Igy a rovid nev tenylegesen utkozik.
  */
  const mind = [
    { id: "gy", name: "Termékek", parent_category_id: null },
    { id: "kt", name: "Koralltápok - Termékek", parent_category_id: "gy" },
    { id: "he", name: "Haleledelek - Termékek", parent_category_id: "gy" },
    { id: "af1", name: "Aquaforest - Koralltápok", parent_category_id: "kt" },
    { id: "af2", name: "Aquaforest - Haleledelek", parent_category_id: "he" },
    { id: "egy", name: "Világítás - Termékek", parent_category_id: "gy" },
  ]

  it("ütköző rövid névnél EGYIK sem rövidül", () => {
    const nevek = megjelenitendoNevek(mind)

    expect(nevek.get("af1")).toBe("Aquaforest - Koralltápok")
    expect(nevek.get("af2")).toBe("Aquaforest - Haleledelek")
  })

  /**
   * ISMERT POZITIV KONTROLL, ES ITT NEM DISZ: a fenti allitas akkor is zold
   * lenne, ha a fuggveny SOHA nem roviditene. Ez a masodik eset bizonyitja,
   * hogy a rovidites egyaltalan mukodik.
   */
  it("egyedi rövid névnél viszont rövidül", () => {
    expect(megjelenitendoNevek(mind).get("egy")).toBe("Világítás")
  })

  /**
   * ES A GYOKER SEM VESZIT: nincs szuloje, tehat nincs mit levagni, es az
   * egyedisege sem tesz vele semmit.
   */
  it("a gyökér neve változatlan", () => {
    expect(megjelenitendoNevek(mind).get("gy")).toBe("Termékek")
  })

  /**
   * A LANC HARMADIK SZINTJE A SZULO ROVID NEVETOL FUGG, es ez az a hely, ahol
   * egy szintenkenti (`rovidNev(nev, szulo.name)`) hivas mar rosszat adna: a
   * szulo NEVEBEN is ott all a nagyszulo.
   */
  it("a harmadik szint a szülő RÖVID nevéből vág", () => {
    const nevek = megjelenitendoNevek([
      { id: "gy", name: "Termékek", parent_category_id: null },
      { id: "v", name: "Világítás - Termékek", parent_category_id: "gy" },
      { id: "led", name: "LED - Világítás", parent_category_id: "v" },
    ])

    expect(nevek.get("led")).toBe("LED")
  })

  /**
   * SERULT SZULO-HIVATKOZAS: a fuggveny nem all be, es a nevet adja vissza. A
   * ciklus-vedelem nelkul ez vegtelen rekurzio lenne, es a LAP nem tolteni be
   * -- nem a teszt bukna el.
   */
  it("körkörös szülő-hivatkozásnál sem áll be", () => {
    const nevek = megjelenitendoNevek([
      { id: "a", name: "A - B", parent_category_id: "b" },
      { id: "b", name: "B - A", parent_category_id: "a" },
    ])

    expect(nevek.size).toBe(2)
  })
})
