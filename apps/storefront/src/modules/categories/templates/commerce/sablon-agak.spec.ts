import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { categoryPageKind } from "../category-page-data"

/**
 * MELYIK KATEGORIA KAPJA AZ UJ LAPOT (P2). A muszaki (Commerce) ag a 117:30
 * szerinti uj lapot, az elo allat ag (korall, hal, gerinctelen) a P3-ig a
 * regi sablont. A sablon aszinkron gyerekei miatt a kiagazast a forrasban
 * merjuk, a besorolast a valodi fuggvenyen.
 *
 * MI PIROSIT: ha az elo allat ag is az uj lapot kapna; ha a muszaki ag a regi
 * sablonon maradna; ha a Reef/Commerce jelolo lemaradna az uj lap korul.
 */
const sablon = readFileSync(join(__dirname, "..", "index.tsx"), "utf8")

describe("a kategória-sablon ágai", () => {
  it("a műszaki ág az új lapot kapja, a jelölővel együtt", () => {
    const ag = sablon.slice(
      sablon.indexOf('if (kind === "technical")'),
      sablon.indexOf("</main>"),
    )
    expect(ag).toContain("<CommerceKategoriaLap")
    expect(ag).toContain("data-acr-mod={categoryPageMode(category)}")
    expect(sablon.match(/<CommerceKategoriaLap/g) ?? []).toHaveLength(1)
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
    expect(route).toMatch(
      /category=\{teljesLanc\(\s*productCategory,\s*kategoriaFelmenoi\(productCategory\.id, mindenKategoria\),?\s*\)\}/,
    )
    const ag = sablon.slice(
      sablon.indexOf("<CommerceKategoriaLap"),
      sablon.indexOf("</main>"),
    )
    expect(ag).toContain("markak={markak}")
  })
})
