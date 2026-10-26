import { describe, expect, it } from "vitest"

import { cimkeNelkul, htmlAlaku, rovidErtek, ROVID_KULCSOK } from "./rovid"
import { szovegek } from "./szovegek"

/*
  A FORMAZOTT SZOVEGEK. MI PIROSIT: ha HTML jut a lapra tisztitasi jelolo
  nelkul; ha egy sima szoveg (a kezdoertekek, "A < b") HTML-nek latszik; ha a
  tisztitatlan HTML cimkei megmaradnak szovegkent; ha mas kulcs (nem a kotott
  helyek) formazott szoveget olvashat.
*/
describe("a formázott szövegek", () => {
  it("a sima szöveg sima marad, a tisztított HTML HTML", () => {
    expect(rovidErtek("Egyszerű szöveg", true)).toEqual({
      szoveg: "Egyszerű szöveg",
    })
    expect(rovidErtek("A < b és c > d", true)).toEqual({
      szoveg: "A < b és c > d",
    })
    expect(rovidErtek("<p>Szia <strong>te</strong></p>", true)).toEqual({
      html: "<p>Szia <strong>te</strong></p>",
    })
  })

  it("tisztítási jelölő nélkül SOHA nem HTML: a címkék lekerülnek", () => {
    const ertek = rovidErtek(
      '<p>Jó</p><script>alert(1)</script><a href="x">link</a>',
      false,
    )
    expect(ertek).not.toHaveProperty("html")
    expect(ertek).toEqual({ szoveg: "Jó link" })
  })

  it("a HTML-alak felismerése és a címke nélküli alak", () => {
    for (const html of [
      "<p>x</p>",
      "x<br>y",
      "<br/>",
      '<a href="/s">x</a>',
      "<ul><li>a</li></ul>",
    ])
      expect(htmlAlaku(html)).toBe(true)
    for (const sima of ["x", "a < b", "<div>x</div>", "5 > 3", ""])
      expect(htmlAlaku(sima)).toBe(false)
    expect(
      cimkeNelkul("<p>Egy</p><p>Kettő<br>Három</p><ul><li>a</li></ul>"),
    ).toBe("Egy Kettő Három a")
  })

  it("a kereső csak a kötött kulcsokat engedi, és a jelölőt követi", () => {
    const texts = { "kezdo.szoveg": "<p>Szia</p>", "kezdo.cim": "<p>Cím</p>" }
    expect(szovegek(texts, true).rovid("kezdo.szoveg")).toEqual({
      html: "<p>Szia</p>",
    })
    expect(szovegek(texts, false).rovid("kezdo.szoveg")).toEqual({
      szoveg: "Szia",
    })
    expect(() => szovegek(texts, true).rovid("kezdo.cim")).toThrow(
      /nem formazott/,
    )
    expect(() => szovegek(texts, true).rovid("nincs.ilyen")).toThrow()
    expect(Array.from(ROVID_KULCSOK).sort()).toEqual([
      "kezdo.1.szoveg",
      "kezdo.2.szoveg",
      "kezdo.3.szoveg",
      "kezdo.szoveg",
    ])
  })

  it("a kezdőérték (sima szöveg) mindkét esetben sima szöveg", () => {
    for (const jelolo of [true, false])
      expect(szovegek(null, jelolo).rovid("kezdo.szoveg")).toEqual({
        szoveg: expect.stringContaining("Végigmegyünk veled"),
      })
  })
})
