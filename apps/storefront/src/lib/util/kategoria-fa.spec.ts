import { describe, expect, it } from "vitest"

import { gyokerekKetSzintel } from "./kategoria-fa"

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
