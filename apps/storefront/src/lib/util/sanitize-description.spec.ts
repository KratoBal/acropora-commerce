import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

import { sanitizeDescription } from "./sanitize-description"

/**
 * A fixtúrák VALÓDI termékleírások a 2026-09-02-i UNAS exportból, alakonként
 * egy. Nem kitalált bemenetek: egy kitalált fixtúra a saját feltevésünket méri,
 * nem a katalógust.
 *
 * A `__fixtures__/leiras/manifest.json` mondja meg, melyik termékből, melyik
 * mezőből (`Short` vagy `Long`) és milyen `IsHtml` érték mellett.
 *
 * A tíz fájl md5 szerint KÜLÖNBÖZŐ, és ez nem magától értetődő: az első
 * válogatásnál a `lista.html` bájtra azonos volt a `meta-charset.html` fájllal,
 * tehát tíz fájl mellett csak kilenc különböző bemenet állt volna. A fixtúrák
 * SZÁMA nem ugyanaz, mint a lefedett esetek száma.
 */
const fixtura = (nev: string) =>
  readFileSync(join(__dirname, "__fixtures__", "leiras", `${nev}.html`), "utf8")

describe("leírás-tisztítás: a valódi katalógus alakjai", () => {
  /**
   * A LEGFONTOSABB ÁLLÍTÁS. 189 termék műszaki adatai `td`/`tr` elemekben
   * állnak, 5362 `td.style` és 2655 `tr.style` attribútummal. Ha a
   * táblázat-jelölők kiesnek, ezek egyetlen szövegfolyammá olvadnak -- nem
   * stílus-kérdés, hanem olvashatóság.
   */
  it("a műszaki táblázat átmegy, a formázásával együtt", () => {
    const ki = sanitizeDescription(fixtura("tablazat-style"))!
    expect(ki).toContain("<table")
    expect(ki).toContain("<td")
    expect(ki).toContain("style=")
  })

  /**
   * Szűk és MÉRT engedmény: az exportban 27 termék ágyaz be videót, és mind a
   * 27 forrása a www.youtube.com. Nem általános iframe-engedély.
   */
  it("a youtube-beágyazás megmarad", () => {
    const ki = sanitizeDescription(fixtura("iframe-youtube"))!
    expect(ki).toContain("<iframe")
    expect(ki).toContain("www.youtube.com/embed")
  })

  /**
   * A `<meta charset>` 1563 helyen áll, 431 leírás-mezőben, 400 terméknél, a
   * szöveg elején maradt szemétként. Egy termékleírásban semmit nem jelent.
   */
  it("a meta kiesik, a körülötte álló tartalom marad", () => {
    const ki = sanitizeDescription(fixtura("meta-charset"))!
    expect(ki).not.toContain("<meta")
    expect(ki).toContain("<h2")
    expect(ki).toContain("<strong")
  })

  it("a külső hivatkozás megmarad, és nem ér vissza a lapra", () => {
    const ki = sanitizeDescription(fixtura("kulso-link"))!
    expect(ki).toContain("<a")
    expect(ki).toContain('href="http')
    expect(ki).toContain("noopener")
  })

  it("a beágyazott kép megmarad", () => {
    const ki = sanitizeDescription(fixtura("beagyazott-kep"))!
    expect(ki).toContain("<img")
    expect(ki).toContain('src="http')
  })

  it("a felsorolás megmarad", () => {
    const ki = sanitizeDescription(fixtura("lista"))!
    expect(ki).toContain("<ul")
    expect(ki).toContain("<li")
  })

  it("a jelölő nélküli szöveg változatlanul átmegy", () => {
    const ki = sanitizeDescription(fixtura("sima-szoveg"))!
    expect(ki).toContain("nyomelemtartály")
    expect(ki).not.toContain("<")
  })

  /**
   * 168 leírásban nincs semmilyen jelölő, és kettőben nyers `>` jel áll egy
   * ASCII nyílban (`szűrőrendszer -> csökkenti...`). A tisztítás `&gt;` alakra
   * escapeli, és a böngésző `->`-ként jeleníti meg.
   *
   * Ez az az eset, ami miatt a HTML-re váltás egyáltalán kockázat lehetne. Az
   * exportban NULLA olyan leírás van, ahol `<` betűt követ, és NULLA, amiben
   * `&` jel áll.
   */
  it("a sima szövegben álló ASCII nyíl nem esik szét", () => {
    const ki = sanitizeDescription(fixtura("nyilas-szoveg"))!
    expect(ki).toContain("-&gt;")
  })

  it("a ritkább szerkezeti jelölők átmennek", () => {
    const ki = sanitizeDescription(fixtura("ritka-jelolok"))!
    expect(ki).toContain("<blockquote")
    expect(ki).toContain("<table")
  })

  /**
   * Van olyan leírás, aminek a TELJES tartalma `<p></p> <p></p>`. Ilyenkor a
   * lapon nem üres doboznak kell megjelennie, hanem semminek.
   */
  it("a jelölő, amiben nincs szöveg, semmit nem ad", () => {
    expect(sanitizeDescription(fixtura("jelolo-szoveg-nelkul"))).toBeNull()
  })

  it("a hiányzó leírás semmit nem ad", () => {
    expect(sanitizeDescription(null)).toBeNull()
    expect(sanitizeDescription(undefined)).toBeNull()
    expect(sanitizeDescription("")).toBeNull()
  })
})

/**
 * SZINTETIKUS ESETEK -- ezek NEM a mai adatból jönnek.
 *
 * A 2026-09-02-i exportban NULLA `<script>`, NULLA `on*` eseménykezelő, NULLA
 * `javascript:` URL, NULLA `<object>`/`<embed>` és NULLA `data:text/html` áll.
 * Vagyis ezek nem leletek, hanem annak a mérései, amiért ez a modul létezik: a
 * leírásokat emberek szerkesztik a régi boltban, és a HOLNAPI szerkesztés ellen
 * épül az őrző.
 *
 * Aki innen számot vesz át, ezt ne mossa össze a valódi alakokkal.
 */
describe("leírás-tisztítás: amit nem szabad átengednie", () => {
  it("a script eltűnik, a körülötte álló szöveg marad", () => {
    const ki = sanitizeDescription(
      "<p>elotte</p><script>alert(1)</script><p>utana</p>",
    )!
    expect(ki).toContain("elotte")
    expect(ki).toContain("utana")
    expect(ki).not.toContain("<script")
    expect(ki).not.toContain("alert")
  })

  /**
   * A hivatkozás SZÖVEGE megmarad, csak a cím esik ki: ott a szöveg a tartalom.
   * Képnél és iframe-nél fordítva, lásd lentebb.
   */
  it("a javascript: cím kiesik, a link szövege marad", () => {
    const ki = sanitizeDescription(
      '<a href="javascript:alert(1)">kattints</a>',
    )!
    expect(ki).toContain("kattints")
    expect(ki).not.toContain("javascript:")
  })

  it("az eseménykezelő kiesik", () => {
    const ki = sanitizeDescription('<p onclick="alert(1)">szoveg</p>')!
    expect(ki).toContain("szoveg")
    expect(ki).not.toContain("onclick")
  })

  it("a data: URL nem lehet képforrás", () => {
    const ki =
      sanitizeDescription(
        '<img src="data:text/html,<script>alert(1)</script>" alt="x">',
      ) ?? ""
    expect(ki).not.toContain("data:text/html")
  })

  /**
   * KÉT állítás egyszerre, és a második a kalibráció leletéből jött: a tisztítás
   * eldobja a nem engedélyezett gépnévre mutató `src`-t, de az ÜRES
   * `<iframe></iframe>` elemet meghagyná -- vagyis egy üres dobozt a lapon.
   * Ezért van a modulban `exclusiveFilter`.
   */
  it("az idegen gépre mutató iframe eltűnik, nem üres dobozként marad", () => {
    const ki = sanitizeDescription(
      '<p>elotte</p><iframe src="https://evil.example/x"></iframe>',
    )!
    expect(ki).toContain("elotte")
    expect(ki).not.toContain("evil.example")
    expect(ki).not.toContain("<iframe")
  })

  /**
   * A `style` attribútum megmarad, mert a műszaki táblázatok tőle olvashatóak --
   * de csak azzal a 11 CSS tulajdonsággal, ami az exportban ténylegesen előfordul.
   * Egyik sem tud elemet a lap fölé pozicionálni vagy URL-t betölteni.
   */
  it("a ráfedésre alkalmas CSS kiesik, a színezés marad", () => {
    const ki = sanitizeDescription(
      '<div style="position:fixed;top:0;color:#ff0000">szoveg</div>',
    )!
    expect(ki).toContain("szoveg")
    expect(ki).toContain("color")
    expect(ki).not.toContain("position")
  })

  it("az object és az embed eltűnik", () => {
    const ki = sanitizeDescription(
      '<object data="x"></object><embed src="y"><p>marad</p>',
    )!
    expect(ki).toContain("marad")
    expect(ki).not.toContain("<object")
    expect(ki).not.toContain("<embed")
  })

  it("a style blokk eltűnik a tartalmával együtt", () => {
    const ki = sanitizeDescription(
      "<style>body{display:none}</style><p>marad</p>",
    )!
    expect(ki).toContain("marad")
    expect(ki).not.toContain("<style")
    expect(ki).not.toContain("display:none")
  })
})
