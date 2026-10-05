import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import {
  FOGYASZTOBARAT_ID,
  JOGI_DOKUMENTUMOK,
  dokumentumForras,
  fogyasztobaratHibakod,
  jogiDokumentum,
  tisztitottJogiSzoveg,
} from "./fogyasztobarat"

/*
  A FOGYASZTOBARAT BEKOTESE (2026-10-05). Ami pirosit: egy dokumentum kulcsa
  elter acrobot listajatol (26237, 26238); a hibakod nem ismerheto fel; egy
  szkript, esemenykezelo, iframe vagy stilus atjut a tisztitason; a widget
  kikerul a gyoker layoutbol.
*/
describe("a Fogyasztóbarát dokumentumai", () => {
  it("hét dokumentum, a Fogyasztóbarát kulcsaival, egyedi oldallal", () => {
    expect(JOGI_DOKUMENTUMOK.map((d) => [d.slug, d.kulcs])).toEqual([
      ["aszf", "aszf"],
      ["adatkezeles", "at"],
      ["impresszum", "imp"],
      ["elallasi-jog", "el_jog"],
      ["elallasi-nyilatkozat", "em"],
      ["szavatossag", "szav_jog"],
      ["suti", "cookie"],
    ])
    expect(jogiDokumentum("nincs-ilyen")).toBeNull()
  })

  it("a forrás a bolt azonosítójával megy, alapból JPNFMVH0", () => {
    expect(FOGYASZTOBARAT_ID).toBe("JPNFMVH0")
    expect(dokumentumForras("at")).toBe(
      "https://admin.fogyasztobarat.hu/api.php?at=JPNFMVH0",
    )
  })

  it("a 200-as hibaválaszt a szövegéből ismeri fel", () => {
    expect(fogyasztobaratHibakod("Hibakód: 1002")).toBe("1002")
    expect(fogyasztobaratHibakod("Hibakod: 1002")).toBe("1002")
    expect(fogyasztobaratHibakod("<h1>ÁSZF</h1><p>Hatályos</p>")).toBeNull()
  })
})

describe("a jogi szöveg tisztítása", () => {
  it("szkript, eseménykezelő, iframe és stílus nem marad; a szerkezet és a link igen", () => {
    const tiszta = tisztitottJogiSzoveg(
      `<style>p{color:red}</style><h2 id="a1">1. Fogalmak</h2>` +
        `<p onclick="alert(1)" style="color:red">Szöveg <a href="https://example.hu" onmouseover="x()">link</a></p>` +
        `<script>alert(2)</script><iframe src="https://evil.example"></iframe>` +
        `<a href="javascript:alert(3)">rossz</a>`,
    )
    expect(tiszta).not.toMatch(
      /<script|<style|<iframe|onclick|onmouseover|style=|javascript:/i,
    )
    expect(tiszta).toContain('<h2 id="a1">1. Fogalmak</h2>')
    expect(tiszta).toContain(
      '<a href="https://example.hu" rel="noopener noreferrer">link</a>',
    )
  })
})

describe("a widget minden oldalon", () => {
  it("a gyökér layout a widgetet a törzsben rendereli", () => {
    const layout = readFileSync(
      join(__dirname, "../../app/layout.tsx"),
      "utf-8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    expect(layout).toMatch(
      /<body>[\s\S]*<FogyasztobaratWidget \/>[\s\S]*<\/body>/,
    )
  })
})
