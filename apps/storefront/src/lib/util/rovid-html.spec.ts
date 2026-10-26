import { describe, expect, it } from "vitest"

import { rovidHtml } from "./rovid-html"

/*
  A "SHORT" PROFIL. MI PIROSIT: ha a bekezdes, felkover, dolt, felsorolas, vagy
  a rendes link elveszik; ha szkript, esemenykezelo, stilus, kep, keret, tabla
  vagy cimsor atmegy; ha `javascript:`, `data:`, `//host` vagy `mailto:` link
  marad; ha a kulso link `rel` nelkul marad.
*/
describe("a rövid formázott szöveg tisztítása", () => {
  it("megtartja a bekezdést, a félkövért, a dőltet, a felsorolást és a rendes linket", () => {
    const ki = rovidHtml(
      '<p>Egy <strong>kettő</strong> <em>három</em></p><ul><li>a</li></ul><ol><li>b</li></ol><p>sor<br>törés <a href="/store">bolt</a> <a href="https://x.hu/a">kül</a></p>',
    )
    for (const resz of [
      "<strong>kettő</strong>",
      "<em>három</em>",
      "<ul><li>a</li></ul>",
      "<ol><li>b</li></ol>",
      "<br />",
      '<a href="/store">bolt</a>',
    ])
      expect(ki).toContain(resz)
    expect(ki).toContain('rel="noopener noreferrer"')
  })

  it("kidobja, ami nem a profilé", () => {
    expect(rovidHtml("<p>jó</p><script>alert(1)</script>")).toBe("<p>jó</p>")
    expect(
      rovidHtml('<p onclick="x()" style="color:red" class="c">jó</p>'),
    ).toBe("<p>jó</p>")
    for (const elem of [
      '<img src="https://x.hu/a.png">',
      '<iframe src="https://x.hu"></iframe>',
      "<table><tr><td>a</td></tr></table>",
      "<h2>cím</h2>",
      "<div>a</div>",
      "<blockquote>a</blockquote>",
    ])
      expect(rovidHtml(elem)).not.toMatch(
        /<(img|iframe|table|h2|div|blockquote)/,
      )
  })

  it("az e-mail cím (mailto: nem üres címmel) link marad, rel nélkül", () => {
    const ki = rovidHtml('<p><a href="mailto:info@acropora.hu">írj</a></p>')
    expect(ki).toContain('href="mailto:info@acropora.hu"')
    expect(ki).not.toContain("rel=")
  })

  it("a veszélyes link nem marad link, a szöveg igen", () => {
    for (const rossz of [
      '<a href="javascript:alert(1)">x</a>',
      '<a href="data:text/html,x">x</a>',
      '<a href="//evil.example">x</a>',
      '<a href="/\\evil.example">x</a>',
      '<a href="mailto:">x</a>',
      '<a href="mailto:?subject=x">x</a>',
      '<a href="tel:+3612345678">x</a>',
    ]) {
      const ki = rovidHtml(rossz)
      expect({ rossz, href: ki.includes("href") }).toEqual({
        rossz,
        href: false,
      })
      expect(ki).toContain("x")
    }
  })
})
