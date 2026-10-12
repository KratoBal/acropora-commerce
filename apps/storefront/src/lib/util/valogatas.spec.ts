import { describe, expect, it } from "vitest"

import {
  valogatasErvenyes,
  valogatasLapja,
  valogatasLeirasForrasa,
} from "./valogatas"

/**
 * A VÁLOGATÁS SZABÁLYAI (t10). MI PIROSÍTJA: egy üres szűrőjű válogatás
 * érvényes lesz (abból a teljes katalógus lenne); egy attribútum-szűrős
 * félig alkalmazva megjelenik; a lapozás túlfut, vagy az utolsó lap csonka.
 */
describe("a válogatás szűrője", () => {
  it("kategória vagy márka kell, attribútum-szűrő nélkül", () => {
    expect(
      valogatasErvenyes({
        category_ids: ["c"],
        os_brand_ids: [],
        attribute_filters: [],
      }),
    ).toBe(true)
    expect(
      valogatasErvenyes({
        category_ids: [],
        os_brand_ids: ["b"],
        attribute_filters: [],
      }),
    ).toBe(true)
    expect(
      valogatasErvenyes({
        category_ids: [],
        os_brand_ids: [],
        attribute_filters: [],
      }),
    ).toBe(false)
    expect(
      valogatasErvenyes({
        category_ids: ["c"],
        os_brand_ids: [],
        attribute_filters: [{ key: "liter", op: "gte", value: 100 }],
      }),
    ).toBe(false)
    expect(valogatasErvenyes(null)).toBe(false)
    expect(valogatasErvenyes({ category_ids: "c", os_brand_ids: [] })).toBe(
      false,
    )
  })
})

describe("a válogatás lapozása", () => {
  const ids = Array.from({ length: 25 }, (_, i) => `p${i}`)

  it("12-es lapok, az utolsó a maradék, a sorrend megmarad", () => {
    expect(valogatasLapja(ids, 1).azonositok).toEqual(ids.slice(0, 12))
    expect(valogatasLapja(ids, 3)).toEqual({
      azonositok: ["p24"],
      lapok: 3,
      letezik: true,
    })
  })

  it("a nem létező lap nem létezik; az üres válogatásnak egy lapja van", () => {
    for (const lap of [0, 4, -1, 1.5, Number.NaN])
      expect(valogatasLapja(ids, lap).letezik, String(lap)).toBe(false)
    expect(valogatasLapja([], 1)).toEqual({
      azonositok: [],
      lapok: 1,
      letezik: true,
    })
  })
})

describe("a válogatás leírása", () => {
  it("a SEO-leírás, különben a bevezető, különben egy mondat", () => {
    expect(
      valogatasLeirasForrasa({
        title: "KH",
        meta_description: "SEO",
        intro: "Bev",
      }),
    ).toBe("SEO")
    expect(
      valogatasLeirasForrasa({
        title: "KH",
        meta_description: " ",
        intro: "Bev",
      }),
    ).toBe("Bev")
    expect(
      valogatasLeirasForrasa({
        title: "KH",
        meta_description: null,
        intro: null,
      }),
    ).toContain("KH")
  })
})
