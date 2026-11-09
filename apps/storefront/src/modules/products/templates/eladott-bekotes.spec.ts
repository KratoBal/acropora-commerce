import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * A NEM ELERHETO EGYEDI DARAB BEKOTESE A SABLON MINDKET AGABAN (V2.4, kartya
 * 0c1265d2).
 *
 * A `ProductTemplate` ket lapot rajzol: a vazat (`hasznaljaVazat`, ezt kapja a
 * korall) es a regi lapot. A #702 a hasonlok `eladott` jelzojet es a "Szólj, ha
 * jön hasonló" urlapot CSAK a regi lapba kototte be, es a teszt kirakaton a
 * korall ELADVA lapja (merve 2026-11-09, acropora-abrolhosensis-ultra) hasonlok
 * es urlap nelkul allt, mikozben a lapcim mar "Nem elérhető" volt. A sablont
 * egyetlen spec sem rendereli (szerver-komponens), ezert a bekotest a forras
 * szintaxisfajan merem, mint a `tartalek-bekotes.spec`.
 *
 * MI PIROSIT: egy hasonlo-lista (`RelatedProducts` a kiegeszito kivetelevel)
 * `eladott` nelkul; vagy kevesebb urlap, mint hasonlo-lista.
 */
type Lista = { kiegeszito: boolean; eladott: boolean; sor: number }

function bekotes(forras: string): { listak: Lista[]; urlapok: number } {
  const fa = ts.createSourceFile(
    "index.tsx",
    forras,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const listak: Lista[] = []
  let urlapok = 0
  const attr = (n: ts.JsxOpeningLikeElement, nev: string) =>
    n.attributes.properties.find(
      (p): p is ts.JsxAttribute =>
        ts.isJsxAttribute(p) && p.name.getText(fa) === nev,
    )
  const bejar = (n: ts.Node) => {
    if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
      const nev = n.tagName.getText(fa)
      if (nev === "RelatedProducts")
        listak.push({
          kiegeszito:
            attr(n, "kapcsolat")?.initializer?.getText(fa) === '"kiegeszito"',
          eladott: !!attr(n, "eladott"),
          sor: fa.getLineAndCharacterOfPosition(n.getStart(fa)).line + 1,
        })
      if (nev === "SzoljHasonlo") urlapok++
    }
    ts.forEachChild(n, bejar)
  }
  bejar(fa)
  return { listak, urlapok }
}

const SABLON = readFileSync(join(__dirname, "index.tsx"), "utf8")

describe("a nem elérhető egyedi darab a sablon mindkét ágában", () => {
  it("minden hasonló-lista megkapja az eladott jelzőt, és mindegyik mellett áll az űrlap", () => {
    const { listak, urlapok } = bekotes(SABLON)
    const hasonlok = listak.filter((l) => !l.kiegeszito)
    // a vaz es a regi lap: ha ez valtozik, ez a meres mar mast nez
    expect(hasonlok.length).toBe(2)
    for (const l of hasonlok) expect(l.eladott, `sor ${l.sor}`).toBe(true)
    expect(urlapok).toBe(hasonlok.length)
  })

  it("a mérő kontrollja: az egyik ágból kivett jelzőt és űrlapot pirosnak látja", () => {
    const jelzoNelkul = SABLON.replace(
      /\n\s*eladott=\{ragadosSavAllapota === "ELADVA"\}/,
      "",
    )
    expect(jelzoNelkul).not.toBe(SABLON)
    expect(
      bekotes(jelzoNelkul)
        .listak.filter((l) => !l.kiegeszito)
        .some((l) => !l.eladott),
    ).toBe(true)
    const urlapNelkul = SABLON.replace(
      /<SzoljHasonlo termekId=\{product\.id\} locale=\{locale\} \/>/,
      "null",
    )
    expect(urlapNelkul).not.toBe(SABLON)
    expect(bekotes(urlapNelkul).urlapok).toBe(1)
  })
})
