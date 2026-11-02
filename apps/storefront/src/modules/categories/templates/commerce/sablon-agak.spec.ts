import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { categoryPageKind } from "../category-page-data"

/**
 * MELYIK KATEGORIA MIT KAP (2026-11-01 ota). A muszaki (Commerce) es az elo
 * allat ag (korall, hal, gerinctelen) UGYANAZT az oldalt kapja, a `kind`
 * donti el a kartyat es az atvetel sort. A sablon aszinkron gyerekei miatt a
 * bekotest a forrasban merjuk, a besorolast a valodi fuggvenyen.
 *
 * MI PIROSIT: ha a sablon visszakapna egy masodik, regi elo allat agat (terv-
 * tokenek, sajat lista); ha a `kind` nem jutna el az oldalig (az elo allat a
 * muszaki kartyat kapna); ha a Reef/Commerce jelolo lemaradna az oldal korul.
 */
const sablon = readFileSync(join(__dirname, "..", "index.tsx"), "utf8")

describe("a kategória-sablon", () => {
  it("egy oldalt rajzol mindkét fajtának, a jelölővel és a fajtával együtt", () => {
    expect(sablon.match(/<CommerceKategoriaLap/g) ?? []).toHaveLength(1)
    expect(sablon).toContain("data-acr-mod={categoryPageMode(category)}")
    expect(sablon).toContain("kind={categoryPageKind(category)}")
    // a regi elo allat sablon nem jon vissza
    expect(sablon).not.toContain("terv-")
    expect(sablon).not.toContain("CategoryProducts")
  })

  it("a Termékek ága műszaki, a három élő állat gyökér nem", () => {
    const k = (name: string, parent?: object) =>
      ({ name, parent_category: parent }) as never
    expect(categoryPageKind(k("Vízkezelés", k("Termékek")))).toBe("technical")
    for (const gyoker of ["Korallok", "Halak", "Gerinctelenek"]) {
      expect(categoryPageKind(k("Valami", k(gyoker)))).toBe("livestock")
    }
  })

  it("a márka a címből a route-on és a sablonon át a lapig ér", () => {
    const route = readFileSync(
      // FE-7 3. resz: a route torzse a kozos modulban (alaplap, `_p`, `_szurt`)
      join(__dirname, "..", "kategoria-lap-torzs.tsx"),
      "utf8",
    )
    expect(route).toContain(
      "const markak = markaAzonositok(searchParams.marka)",
    )
    expect(route).toContain("markak={markak}")
    // A teljes felmeno-lanc a listabol (a bolt API csak egy szulot ad).
    expect(route).toContain('fields: "id,name,handle,parent_category_id"')
    // FE-7 3. resz: a lanc valtozoba kerult, mert a lapszam-ellenorzes is hasznalja
    expect(route).toMatch(
      /const lanc = teljesLanc\(\s*productCategory,\s*kategoriaFelmenoi\(productCategory\.id, mindenKategoria\),?\s*\)/,
    )
    expect(route).toContain("category={lanc}")
    const ag = sablon.slice(sablon.indexOf("<CommerceKategoriaLap"))
    expect(ag).toContain("markak={markak}")
  })
})
