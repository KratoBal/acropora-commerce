import { readdirSync, readFileSync } from "fs"
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
/**
 * A HATOKOR-ALLITAS: NEM AZ ELEMEKRE MER, HANEM ARRA, HOGY NE MARADJON KIMARADO.
 *
 * === MIERT NEM ELEG AZ ELEM-SZINTU ALLITAS ===
 *
 * A fejlec es a lablec allitasa NEVEN nevezi a ket elemet. Ha holnap egy
 * HARMADIK felulet is a lap foldjet veszi fel a vazon KIVUL, egyik sem szol --
 * pontosan ez tortent a lablec-cel, miutan a fejlec megjavult, es MEGINT
 * megtortent a `body`-val, miutan a lablec is bekerult.
 *
 * (acrobot kikotese, 2026-09-09, uzenet 16737: "AZ ALLITAS A HATOKORRE
 * SZOLJON, ne az elemre.")
 *
 * === AMIT EZ MER ===
 *
 * Osszeszedi, MELY FAJLOK allitjak sajat hatterkent a `--terv-hatter` tokent,
 * es osszeveti egy NEVESITETT listaval. Egy uj ilyen felulet felvetele pirosra
 * valt, es a felvevo dont: a vazon BELUL all (akkor a lista bovul), vagy KIVUL
 * (akkor a sotet valasztoba is be kell kerulnie).
 *
 * === AMIT NEM MER ===
 *
 * Azt nem, hogy egy fajl a vazon belul vagy kivul rendereleodik -- ezt statikus
 * szovegbol nem lehet eldonteni. Ezert a lista mellett ott all, MELYIK hova
 * tartozik, es a guard a LISTA valtozasat fogja meg, nem a hovatartozast.
 */
describe("a lap földjét viselő felületek hatóköre", () => {
  const gyoker = join(__dirname, "..")

  const foldetVisel = () => {
    const talalt: string[] = []
    const bejar = (ut: string) => {
      for (const bejegyzes of readdirSync(ut, { withFileTypes: true })) {
        const teljes = join(ut, bejegyzes.name)
        if (bejegyzes.isDirectory()) {
          bejar(teljes)
          continue
        }
        if (!/\.(tsx|css)$/.test(bejegyzes.name)) continue
        if (/\.spec\./.test(bejegyzes.name)) continue
        const kod = kodSzoveg(readFileSync(teljes, "utf-8"))
        if (/background:\s*"?var\(--terv-hatter\)"?/.test(kod)) {
          talalt.push(teljes.slice(gyoker.length + 1))
        }
      }
    }
    bejar(gyoker)
    return talalt.sort()
  }

  /**
   * A NEVESITETT LISTA. A megjegyzes mondja meg, melyik hol all -- ez a
   * TUDAS, amit egy puszta fajlnev-lista nem hordozna.
   */
  const VART = [
    /* a vazon KIVUL, tehat a sotet valasztoban is szerepelnie kell */
    "modules/layout/templates/footer/index.tsx",
    "modules/layout/templates/nav/index.tsx",
    "styles/globals.css" /* a `body` szabalya ES a sotet keszlet */,
    /* a vazon BELUL, tehat a jelolotol oroklik */
    "modules/layout/templates/nav/fejlec-menu.tsx" /* a fejlecen belul */,
    "modules/products/components/lap-vaz/index.tsx",
    "modules/products/components/lap-vaz/ragados-sav.tsx",
    "modules/products/components/vasarlas/dobozok.tsx",
  ].sort()

  it("pontosan a névvel ismert felületek viselik a lap földjét", () => {
    expect(foldetVisel()).toEqual(VART)
  })

  /**
   * ES A HAROM KIVUL ALLO MIND A SOTET SZABALYBAN ALL.
   *
   * A `body` 2026-09-09-en kerult be harmadikkent: a `html` atlatszo, tehat a
   * bongeszo VASZNA a body hatteret veszi at, es az egy sotet lapon vilagos
   * maradt. Merve a kitelepitett lapon: a vaz oklch(0.17 0.016 250), a body
   * oklch(0.99 0.004 80).
   */
  it("a vázon kívül álló három felület mind a sötét szabályban van", () => {
    const sotetKezd = css.indexOf('[data-vilag="sotet"]')
    const blokk = css.slice(0, css.indexOf("{", sotetKezd))

    expect(blokk).toContain('header[data-testid="fejlec"]')
    expect(blokk).toContain('footer[data-testid="lablec-sik"]')
    expect(blokk).toMatch(/body:has\(\[data-vilag="sotet"\]\)\s*,/)
  })
})

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
    const blokk = css.slice(
      0,
      css.indexOf("{", css.indexOf('[data-vilag="sotet"]')),
    )

    expect(blokk).toContain('header[data-testid="fejlec"]')
    expect(blokk).toContain('footer[data-testid="lablec-sik"]')
  })
})
