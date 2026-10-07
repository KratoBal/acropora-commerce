import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * MINDEN `<Thumbnail>` ATADJA A TERMEK NEVET (Balazs 2026-10-07, 5. pont;
 * barracuda megjegyzese a #519 atvetelenel: a rendeles tetel-soranak kepe nev
 * nelkul maradt).
 *
 * A `Thumbnail` `alt` nelkul diszitokepkent `alt=""`-t kap. Termekkepen ez hiba,
 * es a renderelt HTML szerzodese csak a mintaoldalakat latja (rendeles-lapot
 * nem). Ezert itt a FORRAS szintaxisfajan: minden hivas `alt`-ot ad.
 *
 * KIVETEL ket iranyu kotessel: ami itt all, annal hianyozhat; ha mar megvan,
 * piros ("vedd ki").
 *
 * MI PIROSIT: egy `<Thumbnail>` `alt` nelkul; egy kivetel, ami mar `alt`-ot ad.
 */
const KIVETEL: Record<string, string> = {
  "modules/layout/components/cart-dropdown/index.tsx":
    "a kosár-gombot murena írja át (FE-7); ott javul",
}

function forrasFajlok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) talalt.push(...forrasFajlok(ut))
    else if (nev.endsWith(".tsx") && !nev.includes(".spec.")) talalt.push(ut)
  }
  return talalt
}

function altNelkuliHivasok(forras: string): number {
  const fa = ts.createSourceFile(
    "x.tsx",
    forras,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let db = 0
  const bejar = (n: ts.Node) => {
    if (
      (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) &&
      n.tagName.getText(fa) === "Thumbnail" &&
      !n.attributes.properties.some(
        (p) =>
          ts.isJsxSpreadAttribute(p) ||
          (ts.isJsxAttribute(p) && p.name.getText(fa) === "alt"),
      )
    )
      db += 1
    ts.forEachChild(n, bejar)
  }
  bejar(fa)
  return db
}

describe("a Thumbnail hívói", () => {
  const src = join(__dirname, "..", "..", "..", "..")
  const hivok = forrasFajlok(src)
    .map((ut) => ({ ut: relative(src, ut), forras: readFileSync(ut, "utf8") }))
    .filter((f) => /<Thumbnail\b/.test(f.forras))

  it("minden hívás alt-ot ad (a kivételt kivéve)", () => {
    // ismert pozitiv kontroll: a kereso tenyleg latja a hivokat
    expect(hivok.length).toBeGreaterThan(4)
    const hiany = hivok
      .filter((f) => !(f.ut in KIVETEL) && altNelkuliHivasok(f.forras) > 0)
      .map((f) => f.ut)
    expect(hiany).toEqual([])
  })

  it("a kivétel még indokolt (különben vedd ki)", () => {
    for (const ut of Object.keys(KIVETEL)) {
      const f = hivok.find((x) => x.ut === ut)
      expect(f, `${ut} már nem hívja a Thumbnail-t`).toBeDefined()
      expect(altNelkuliHivasok(f!.forras), ut).toBeGreaterThan(0)
    }
  })
})
