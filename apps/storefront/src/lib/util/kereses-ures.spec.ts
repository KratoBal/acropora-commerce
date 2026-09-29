import { describe, expect, it } from "vitest"

import { fejlecMenuPontok } from "./fejlec-menu-pontok"
import { KERESES_TIPPEK, kategoriaKartyak } from "./kereses-ures"

const kat = (
  id: string,
  handle: string,
  category_children: { id: string; handle: string }[] = [],
) => ({ id, handle, category_children })

/** A stage fa alakja: a technikai gyoker "termékek", alatta a Vízkezelés. */
const GYOKEREK = [
  kat("k", "korallok"),
  kat("h", "halak"),
  kat("t", "termékek", [
    { id: "v", handle: "vízkezelés---termékek" },
    { id: "l", handle: "lehabzók---termékek" },
  ]),
  kat("g", "gerinctelenek"),
]

/**
 * A KATEGORIA-KARTYAK. MI PIROSIT: ha egy "Hamarosan" pont (oldal nelkul)
 * kartyat kap; ha a menu alkategoria-pontja kimarad vagy rossz azonositot
 * kap; ha a sorrend nem a menue, hanem a katalogus.
 */
describe("a nincs-találat lap kategória-kártyái", () => {
  it("a menü oldallal bíró pontjai, a menü sorrendjében", () => {
    expect(kategoriaKartyak(fejlecMenuPontok(GYOKEREK), GYOKEREK)).toEqual([
      { felirat: "Korallok", handle: "korallok", id: "k" },
      { felirat: "Halak", handle: "halak", id: "h" },
      { felirat: "Gerinctelenek", handle: "gerinctelenek", id: "g" },
      { felirat: "Vízkezelés", handle: "vízkezelés---termékek", id: "v" },
    ])
  })

  it("üres katalógusnál nincs kártya", () => {
    expect(kategoriaKartyak(fejlecMenuPontok([]), [])).toEqual([])
  })
})

/** A TIPPEK a keret szavai (253:81); a merest a konstans fejlece irja. */
describe("a keresési tippek", () => {
  it("a keret öt szava, a keret sorrendjében", () => {
    expect([...KERESES_TIPPEK]).toEqual([
      "ReefLED",
      "Acropora",
      "Bohóchal",
      "KH teszt",
      "MP40",
    ])
  })
})
