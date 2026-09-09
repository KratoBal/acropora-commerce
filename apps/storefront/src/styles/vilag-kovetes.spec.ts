import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A MEGJEGYZESEKET KISZEDJUK, ES ITT KULONOSEN KELL.
 *
 * A szabaly FOLOTT egy hosszu magyarazat all arrol, MIERT `:has()` es miert
 * egy blokkban -- vagyis a fajl sajat szovege tartalmazza azokat a jeleket,
 * amiket ezek az allitasok keresnek. Szures nelkul a magyarazat elegitene ki
 * oket, nem a szabaly.
 */
const kodSzoveg = (szoveg: string) => szoveg.replace(/\/\*[\s\S]*?\*\//g, "")

const css = kodSzoveg(readFileSync(join(__dirname, "globals.css"), "utf-8"))

/**
 * A FAJL NEVE 2026-09-09-EN VALTOZOTT (`fejlec-vilag` -> `vilag-kovetes`), mert
 * a lablec ugyanezt a szabalyt kapta meg. Egy `fejlec` nevu fajl, amiben a
 * lablec allitasai is allnak, pontosan az a fajta felrevezetes, amit a repo
 * mashol mar gyujtott: a nev tullel azt a feltetelt, ami letrehozta.
 *
 * A FEJLEC A TERMEK VILAGAT KOVETI.
 *
 * Merve a kitelepitett lapon (2026-09-09): a korall lap vaza sotet
 * (`data-vilag="sotet"`, oklch(0.17 0.016 250)), a FEJLEC hattere viszont
 * oklch(0.99 0.004 80) volt -- vilagos. A muszaki termek lapjan mind a ketto
 * vilagos, tehat ott egyezett.
 *
 * AMIT EZ A SPEC MER: hogy a kapcsolat LETEZIK, es hogy EGY helyen allnak az
 * ertekek. Azt, hogy a kepernyon tenyleg sotet lesz, csak a kitelepitett lapon
 * lehet megnezni -- a jsdom nem futtat CSS-t, es a `:has()` amugy is a teljes
 * dokumentumra szol.
 */
describe("a fejléc a termék világát követi", () => {
  /** ISMERT POZITIV KONTROLL: tenyleg a stiluslapot olvastuk. */
  it("a forrás olvasható, és tényleg a stíluslap", () => {
    expect(css).toContain(":root")
    expect(css).toContain('[data-vilag="sotet"]')
  })

  it("a fejléc a sötét világ szabályában is szerepel", () => {
    expect(css).toMatch(
      /body:has\(\[data-vilag="sotet"\]\)\s+header\[data-testid="fejlec"\]/,
    )
  })

  /**
   * ES A LENYEG: EGY BLOKK, KET VALASZTO. Egy masodik, ugyanolyan ertekeket
   * tartalmazo blokk pontosan az a hiba lenne, amit ma delelott ketszer
   * javitottunk: ket szam, ami kesobb szetcsuszik.
   *
   * A `--terv-hatter` a sotet keszlet elso erteke; ha ketszer allna a fajlban a
   * gyokeren kivul, az masolatot jelentene.
   */
  it("a sötét értékek egyetlen blokkban állnak", () => {
    const sotetBlokkok = css.match(/\[data-vilag="sotet"\][^{]*\{/g) ?? []

    expect(sotetBlokkok).toHaveLength(1)
  })

  /**
   * A KAPCSOLAT NEM JS-BOL JON. Egy kliens komponens es egy effekt ugyanezt
   * adna, de a betoltes utan VALTANA: a latogato latna felvillanni a vilagos
   * fejlecet. Ha valaki mégis arra cserelne, ez az allitas nem szol -- ezert
   * all itt a `:has()` NEVE, es nem a hianya valaminek.
   */
  it("a kapcsolat CSS-ben áll, nem effektben", () => {
    expect(css).toContain("body:has(")
  })
})

/**
 * ES A LABLEC UGYANIGY -- HARMADIK ESET UGYANARRA A HIBAOSZTALYRA.
 *
 * Merve a kitelepitett sotet lapon (2026-09-09): a `data-vilag` jelolon KIVUL
 * 166 elem all, es kozuluk PONTOSAN EGY viselt vilagos terv-erteket -- a
 * lablec hattere (oklch(0.99 0.004 80), a vilagos `--terv-hatter`).
 *
 * A MEROHELY ISMERT POZITIV KONTROLLAL MENT: ugyanaz a kereses a VILAGOS lapon
 * 35 talalatot ad (ott a vilagos ertek a helyes, tehat a talalat nem hiba).
 * A sotet lap egyetlen talalata igy nem a kereses tulajdonsaga.
 *
 * AMIT EZ A SPEC MER: hogy a lablec BENNE VAN a sotet szabaly valasztojaban.
 * Azt, hogy a kepernyon tenyleg sotet lesz, csak a kitelepitett lapon lehet
 * megnezni -- ugyanaz a hatar, mint a fejlecnel.
 */
describe("a lábléc is a termék világát követi", () => {
  it("a lábléc síkja a sötét világ szabályában is szerepel", () => {
    expect(css).toMatch(
      /body:has\(\[data-vilag="sotet"\]\)\s+footer\[data-testid="lablec-sik"\]/,
    )
  })

  /**
   * ES A KETTO UGYANABBAN A BLOKKBAN ALL. A "egyetlen blokk" allitas fentebb
   * ezt mar orzi; ez a sor azt mondja meg, hogy a lablec NEM egy masodik,
   * sajat blokkot kapott ugyanazokkal a szamokkal.
   */
  it("a fejléc és a lábléc ugyanabban a szabályban áll", () => {
    const blokk = css.slice(0, css.indexOf("{", css.indexOf('[data-vilag="sotet"]')))

    expect(blokk).toContain('header[data-testid="fejlec"]')
    expect(blokk).toContain('footer[data-testid="lablec-sik"]')
  })
})
