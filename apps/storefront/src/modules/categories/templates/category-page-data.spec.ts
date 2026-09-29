import { describe, expect, it } from "vitest"

import {
  categoryPageKind,
  categoryPageMode,
  helperCopyFor,
} from "./category-page-data"

/**
 * A kategóriaoldalnak EGY vázra van szüksége, nem két, egymástól lassan
 * elsodródó oldalra. Ez a tiszta döntés az egyetlen kapcsoló a két
 * adatmegjelenítés között.
 */
describe("a kategóriaoldal adatnézete", () => {
  it("a három élőállat-gyökér alatt élőállat nézetet ad", () => {
    for (const root of ["Korallok", "Halak", "Gerinctelenek"]) {
      expect(
        categoryPageKind({
          name: "Leveles kategória",
          parent_category: { name: root },
        }),
      ).toBe("livestock")
    }
  })

  it("a mélyen levő kategóriánál is eléri az élőállat-gyökeret", () => {
    expect(
      categoryPageKind({
        name: "SPS",
        parent_category: {
          name: "Akvakultúra",
          parent_category: {
            name: "Fragok",
            parent_category: { name: "Korallok" },
          },
        },
      }),
    ).toBe("livestock")
  })

  it("a nem élőállat kategória műszaki nézetet kap", () => {
    expect(
      categoryPageKind({
        name: "Világítás",
        parent_category: { name: "Termékek" },
      }),
    ).toBe("technical")
  })

  /** Pozitív kontroll: a két ág nem csupán névben különbözik. */
  it("a két segéddoboz eltérő, adatvezérelt szöveget kap", () => {
    expect(helperCopyFor("technical").title).toBe("Méretezés-segéd")
    expect(helperCopyFor("livestock").eyebrow).toBe("ÉLŐ ÁLLAT")
    expect(helperCopyFor("livestock").description).toBe(
      "Élő állatot csak személyesen, üzletünkben adunk át neked.",
    )
  })
})

/**
 * A KATEGORIALAP MODJA (P1b): a fejlec ebbol a jelolobol valt Reef-re. A P1a
 * szabalya (`acropora-mod.ts`), a gyokertol a lapig tarto nevsoron.
 *
 * MI PIROSIT: ha csak a lap SAJAT neve dontene (a mely alkategoria "Leveles"
 * neve semmit nem mond); ha a sorrend fordított lenne (a WYSIWYG-t a gyoker
 * helyen keresne); ha a technikai ag Reef lenne.
 */
describe("a kategóriaoldal módja", () => {
  it("a korall, hal és gerinctelen ág mélyen is Reef", () => {
    for (const root of ["Korallok", "Halak", "Gerinctelenek"]) {
      expect(
        categoryPageMode({
          name: "Leveles",
          parent_category: { name: "Köztes", parent_category: { name: root } },
        }),
        root,
      ).toBe("reef")
    }
  })

  it("a technikai ág Commerce", () => {
    expect(
      categoryPageMode({
        name: "Világítás",
        parent_category: { name: "Termékek" },
      }),
    ).toBe("commerce")
  })

  it("a WYSIWYG ág más gyökér alatt is Reef", () => {
    expect(
      categoryPageMode({
        name: "WYSIWYG",
        parent_category: { name: "Termékek" },
      }),
    ).toBe("reef")
  })
})
