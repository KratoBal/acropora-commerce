import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * A SABLON BEKOTESE: A SUSPENSE-TARTALEK `tartalek`-KAL RAJZOL (barracuda
 * atvetele, #519).
 *
 * A `Cimsor` tesztje (`valodi-tartalom.spec.tsx`) a jelzot kezzel adja at, tehat
 * azt meri, hogy a jelzo HAT. Azt nem, hogy a sablon ATADJA: ha a fallbackrol
 * lekerul, a streamelt elso HTML-ben ujra ket H1 all (merve a teszt kirakaton
 * 2026-10-07, a FE-1 elott). A `ProductTemplate`-et egyetlen spec sem rendereli
 * (szerver-komponens, sok adat-fuggoseggel), ezert a bekotest a FORRAS
 * szintaxisfajan merem: minden `<MuszakiLap>`, ami egy `fallback` erteke,
 * `tartalek`-kal all, es ami nem az, az nelkule (kulonben a lapon NULLA H1 lenne).
 *
 * MI PIROSIT: a `tartalek` lekerul a fallbackrol; a vegleges lap is megkapja; vagy
 * a `MuszakiLap` eltunik a sablonbol (akkor ez a meres mar mast nez).
 */
type Hivas = { fallbackban: boolean; tartalek: boolean; sor: number }

function muszakiLapHivasok(forras: string): Hivas[] {
  const fa = ts.createSourceFile(
    "index.tsx",
    forras,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const hivasok: Hivas[] = []
  const bejar = (n: ts.Node) => {
    if (
      (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) &&
      n.tagName.getText(fa) === "MuszakiLap"
    ) {
      let szulo: ts.Node | undefined = n.parent
      let fallbackban = false
      while (szulo && !ts.isSourceFile(szulo)) {
        if (ts.isJsxAttribute(szulo) && szulo.name.getText(fa) === "fallback") {
          fallbackban = true
          break
        }
        szulo = szulo.parent
      }
      hivasok.push({
        fallbackban,
        tartalek: n.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && p.name.getText(fa) === "tartalek",
        ),
        sor: fa.getLineAndCharacterOfPosition(n.getStart(fa)).line + 1,
      })
    }
    ts.forEachChild(n, bejar)
  }
  bejar(fa)
  return hivasok
}

const SABLON = readFileSync(join(__dirname, "index.tsx"), "utf8")

describe("a terméklap sablonja", () => {
  it("a Suspense-tartalék tartalek-kal, a végleges lap nélküle", () => {
    const h = muszakiLapHivasok(SABLON)
    expect(h.filter((x) => x.fallbackban).length).toBeGreaterThan(0)
    expect(h.filter((x) => !x.fallbackban).length).toBeGreaterThan(0)
    for (const x of h) expect(x.tartalek, `sor ${x.sor}`).toBe(x.fallbackban)
  })

  it("a mérő kontrollja: a jelző nélküli fallbackot pirosnak látja", () => {
    const rontott = SABLON.replace(/(<MuszakiLap\s+)tartalek\s+/, "$1")
    expect(rontott).not.toBe(SABLON)
    const h = muszakiLapHivasok(rontott)
    expect(h.some((x) => x.fallbackban && !x.tartalek)).toBe(true)
  })
})
