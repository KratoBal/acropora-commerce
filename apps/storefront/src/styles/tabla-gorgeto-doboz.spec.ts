import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * MINDEN TÁBLÁZAT GÖRGETŐ DOBOZBAN ÁLL, VAGY TELEFONON BLOKK (a 2026-11-19-i három hibakör mintája: egy doboz nélküli táblázat
 * 390 pixelen az egész lapot oldalra tolta; a kirakat ma tiszta, ez az őrző, hogy az is maradjon. Ugyanez az őr áll az OS-ben,
 * #2760, és a Caparium-ban, #276).
 *
 * A teszt a kirakat minden .tsx fájlját a TypeScript AST-jén olvassa, és minden `<table>`-ről megkérdezi: van-e ugyanabban a
 * fájlban görgető őse (`overflow-x-auto`, `overflow-auto`, `overflow-x-scroll`), vagy a saját osztálya telefonon blokká
 * teszi, és csak egy töréspont fölött táblázat (`block … small:table`, mint a kosár). A KIVÉTELEK névvel és okkal állnak.
 * MI PIROSIT: egy új vagy áthelyezett táblázat doboz nélkül. A HATÁR: forrást olvas; a valódi bizonyíték a hibakör 390 px-es
 * kilógás-mérése (`kirakat-hibakor.mjs`).
 */
const SRC = join(__dirname, "..")
const KIVETEL: Record<string, string> = {
  "modules/common/components/ui/index.tsx":
    "a közös Table alapkomponens: a dobozról a hívója dönt (kosár-előnézet, rendelés-tételek, vázak)",
  "modules/lablec-oldalak/szallitas-lap.tsx":
    "a szállítási díjsávok három keskeny oszlopa rövid összegekkel: elfér; ha bővül, dobozt kap",
}

const tsxUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return tsxUnder(p)
    return name.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(name) ? [p] : []
  })
const tagOf = (n: ts.Node): string | null =>
  ts.isJsxElement(n)
    ? n.openingElement.tagName.getText()
    : ts.isJsxSelfClosingElement(n)
      ? n.tagName.getText()
      : null
const classOf = (n: ts.Node): string => {
  const attrs = ts.isJsxElement(n)
    ? n.openingElement.attributes
    : ts.isJsxSelfClosingElement(n)
      ? n.attributes
      : null
  const a = attrs?.properties.find(
    (p): p is ts.JsxAttribute =>
      ts.isJsxAttribute(p) && p.name.getText() === "className",
  )
  return a?.initializer ? a.initializer.getText() : ""
}
const GORGETO =
  /(^|[\s"'`])(overflow-x-auto|overflow-auto|overflow-x-scroll)([\s"'`]|$)/
/** a phone shows it as a block, a breakpoint makes it a table again */
const TELEFONON_BLOKK = (cls: string) =>
  /(^|[\s"'`])block([\s"'`]|$)/.test(cls) && /\b[a-z]+:table\b/.test(cls)

function dobozNelkuliTablazatok(): { hibas: string[]; osszes: number } {
  const hibas: string[] = []
  let osszes = 0
  for (const file of tsxUnder(SRC)) {
    const rel = relative(SRC, file)
    const sf = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const visit = (n: ts.Node) => {
      if (tagOf(n) === "table") {
        osszes += 1
        let ok = TELEFONON_BLOKK(classOf(n)) || rel in KIVETEL
        for (let p = n.parent; p && !ok; p = p.parent)
          ok = tagOf(p) !== null && GORGETO.test(classOf(p))
        if (!ok)
          hibas.push(
            `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`,
          )
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return { hibas, osszes }
}

describe("minden táblázat görgető dobozban áll, vagy telefonon blokk", () => {
  it("nincs doboz nélküli <table> a kirakatban (a kivételeken kívül)", () => {
    const { hibas, osszes } = dobozNelkuliTablazatok()
    expect(osszes).toBeGreaterThanOrEqual(3)
    expect(hibas).toEqual([])
  })
})
