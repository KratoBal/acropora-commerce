import { describe, expect, it } from "vitest"

import { lablecHtml } from "./lablec-html"

/*
  A LABLEC BEMUTATKOZASA. MI PIROSIT: ha szkript, esemenykezelo, `javascript:`
  vagy `data:` cim, stilus, kep, keret vagy protokoll-relativ link atmegy; ha a
  szoveg (bekezdes, felkover, dolt, felsorolas, kis cimsor, rendes link)
  elveszik; ha a kulso link `rel` nelkul marad; ha ures bemenetre nem ures
  szoveg jon.
*/
describe("a lábléc bemutatkozása", () => {
  it("megtartja a bekezdést, a félkövért, a dőltet, a felsorolást és a rendes linket", () => {
    const html =
      '<p>Tengeri <strong>akvarisztika</strong> <em>2004</em> óta.</p><ul><li>Élő korallok</li></ul><p><a href="https://acropora.hu/blog">Blog</a> és <a href="/store">termékek</a></p><h3>Cím</h3>'
    const ki = lablecHtml(html)
    expect(ki).toContain("<strong>akvarisztika</strong>")
    expect(ki).toContain("<em>2004</em>")
    expect(ki).toContain("<ul><li>Élő korallok</li></ul>")
    expect(ki).toContain('<a href="/store">termékek</a>')
    expect(ki).toContain("<h3>Cím</h3>")
  })

  it("a külső link rel-t kap, a bolti út nem", () => {
    const ki = lablecHtml('<a href="https://acropora.hu/blog">x</a>')
    expect(ki).toContain('rel="noopener noreferrer"')
    expect(lablecHtml('<a href="/store">x</a>')).not.toContain("rel=")
  })

  it("kidobja a szkriptet, az eseménykezelőt, a veszélyes címet és a többi elemet", () => {
    expect(lablecHtml("<p>jó</p><script>alert(1)</script>")).toBe("<p>jó</p>")
    expect(lablecHtml('<p onclick="x()">jó</p>')).toBe("<p>jó</p>")
    expect(lablecHtml('<p style="color:red" class="x">jó</p>')).toBe(
      "<p>jó</p>",
    )
    for (const rossz of [
      '<a href="javascript:alert(1)">x</a>',
      '<a href="data:text/html,x">x</a>',
      '<a href="//evil.example">x</a>',
      '<a href="/\\evil.example">x</a>',
      '<a href="mailto:a@b.hu">x</a>',
    ]) {
      const ki = lablecHtml(rossz)
      expect({ rossz, href: ki.includes("href") }).toEqual({
        rossz,
        href: false,
      })
      expect(ki).toContain("x")
    }
    for (const elem of [
      '<img src="https://x.hu/a.png">',
      '<iframe src="https://x.hu"></iframe>',
      "<table><tr><td>a</td></tr></table>",
      '<div data-x="1">a</div>',
    ])
      expect(lablecHtml(elem)).not.toMatch(/<(img|iframe|table|div)/)
  })

  it("üres bemenetre üres szöveg", () => {
    expect(lablecHtml(null)).toBe("")
    expect(lablecHtml(undefined)).toBe("")
    expect(lablecHtml("")).toBe("")
  })
})
