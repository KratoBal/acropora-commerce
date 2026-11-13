import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * A KIS FELIRATOK LEGALABB 12 PX-ESEK, ES A LEBEGO CIMKE CSAK A SAJAT MEZOJEN (stage 390 px, 2026-11-13). MI PIROSIT: ha a
 * kategoria-lista "ELO ALLAT" felirata, az ELKELT / akcio jelveny, a kartya markaja es kesz-lete, a termeklap eyebrow-ja ujra 9,5-11,2 px
 * lenne; ha a `.text-xsmall-regular` ujra 10 px lenne; ha az `input ~ label` szelektor ujra MINDEN input utani <label>-re
 * ramutatna (a "Szurok" gombot es a hirlevel hozzajarulasat 10 px-re es 8 px-szel feljebb vitte, mert a szelektor a lebego cimke
 * szamara irodott, de nem volt a mezojehez kotve).
 * A MERES A FORRAS (a jsdom a stilusokat nem szamolja): a szelektor es a betumeretek.
 */
const SRC = join(process.cwd(), "src")
const read = (path: string): string => readFileSync(join(SRC, path), "utf8")

const TOO_SMALL = /text-\[(?:9|10|11)(?:\.\d+)?px\]/

describe("a legkisebb betumeret es a lebego cimke", () => {
  it.each([
    "modules/categories/templates/commerce/termek-kartya.tsx",
    "modules/categories/templates/commerce/elo-allat-kartya.tsx",
    "modules/categories/templates/commerce/lista-lap.tsx",
    "modules/products/components/lap-vaz/valodi-tartalom.tsx",
  ])("%s nem tartalmaz 12 px alatti betumeretet", (path) => {
    expect(read(path)).not.toMatch(TOO_SMALL)
  })

  it("a `.text-xsmall-regular` 12 px", () => {
    const css = read("styles/globals.css")
    const rule = /\.text-xsmall-regular\s*\{([^}]*)\}/.exec(css)
    expect(rule).not.toBeNull()
    expect(rule![1]).toContain("text-[12px]")
    expect(rule![1]).not.toMatch(TOO_SMALL)
  })

  it("a lebego cimke szelektora a mezo sajat burkolojara kotott, nem minden input utani label-re", () => {
    // a megjegyzesek nelkul (a magyarazat maga is leirja a regi szelektort)
    const css = read("styles/globals.css").replace(/\/\*[\s\S]*?\*\//g, "")
    // semmi `input... ~ label` nem allhat `.floating-field` nelkul
    const selectors: string[] = []
    const pattern = /([^{},]*input[^{},]*~\s*label)/g
    for (let m = pattern.exec(css); m; m = pattern.exec(css))
      selectors.push(m[1]!.trim())
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors)
      expect(selector).toMatch(/^\.floating-field\s/)
    // es a mezo burkoloja viseli az osztalyt
    expect(read("modules/common/components/input/index.tsx")).toContain(
      "floating-field",
    )
  })
})
