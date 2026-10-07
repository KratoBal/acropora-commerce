import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

import { szurtMetaadat } from "./oldal-metaadat"

/**
 * A SZURT LAPOK NOINDEX, FOLLOW (SEO frontend FE-4, Balazs 4. pontja).
 *
 * A keresest, a facetet es a rendezest a middleware a belso `_szurt` utakra irja
 * at (`belso-utvonalak.js`, FE-7 3. resz). Ott minden keres szurt, tehat az ott
 * allo minden lap `generateMetadata`-ja a `szurtMetaadat(...)`-ot adja vissza; a
 * nyilvanos (nem `_` kezdetu) listalapok viszont nem: azok indexelhetok.
 *
 * MI PIROSIT: egy `_szurt` lap a sima alaplap-metaadatot adja (a szurt URL
 * indexelhetove valna); egy nyilvanos listalap noindexet kap (a kategoria eltunne
 * a keresobol); a `szurtMetaadat` elveszti a canonicalt vagy a `follow`-t.
 */
function lapok(mappa: string): string[] {
  const talalt: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) talalt.push(...lapok(ut))
    else if (nev === "page.tsx") talalt.push(ut)
  }
  return talalt
}

/** A `generateMetadata` return-kifejezeseinek hivott fuggvenyei, nev szerint. */
function metaadatHivasok(forras: string): string[] | null {
  const fa = ts.createSourceFile("p.tsx", forras, ts.ScriptTarget.Latest, true)
  let talalt: string[] | null = null
  const bejar = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "generateMetadata") {
      talalt = []
      const benne = (m: ts.Node) => {
        if (ts.isReturnStatement(m) && m.expression) {
          let e: ts.Expression = m.expression
          while (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e))
            e = e.expression
          talalt!.push(ts.isCallExpression(e) ? e.expression.getText(fa) : "")
        }
        ts.forEachChild(m, benne)
      }
      benne(n)
    }
    ts.forEachChild(n, bejar)
  }
  bejar(fa)
  return talalt
}

const MAIN = join(__dirname, "..", "..", "app", "[countryCode]", "(main)")

describe("a szűrt lapok noindexe", () => {
  it("minden _szurt lap a szurtMetaadat-ot adja vissza", () => {
    const szurt = lapok(join(MAIN, "%5Fszurt"))
    // ismert pozitiv kontroll: a harom lista (kategoria, marka, bolt)
    expect(szurt.length).toBe(3)
    for (const ut of szurt)
      expect(
        metaadatHivasok(readFileSync(ut, "utf8")),
        relative(MAIN, ut),
      ).toEqual(["szurtMetaadat"])
  })

  it("a nyilvános listalapok nem kapják meg", () => {
    for (const lista of [
      "categories/[...category]/page.tsx",
      "collections/[handle]/page.tsx",
      "store/page.tsx",
    ]) {
      const forras = readFileSync(join(MAIN, lista), "utf8")
      expect(forras, lista).not.toMatch(/szurtMetaadat|index:\s*false/)
    }
  })

  it("a szurtMetaadat: noindex, follow, és a canonical az alapé marad", () => {
    const alap = {
      title: "Szivattyúk | Acropora",
      alternates: { canonical: "/hu/categories/szivattyuk" },
      robots: { index: true, follow: true },
    }
    expect(szurtMetaadat(alap)).toEqual({
      ...alap,
      robots: { index: false, follow: true },
    })
  })
})
