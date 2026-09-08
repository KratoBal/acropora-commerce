import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A MEGJEGYZESEKET KISZEDJUK, ES EZ ITT KULONOSEN FONTOS: a fejlec fejleceben
 * ott all a tervbeli ERTEKEK tablazata (`oklch(...)`), es ott all az is, hogy
 * korabban `Cart (0)` szoveg volt. Megjegyzes-szures nelkul mindket
 * hiany-allitas SAJAT MAGAT elegitene ki.
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const forras = (...ut: string[]) =>
  kodSzoveg(readFileSync(join(__dirname, ...ut), "utf-8"))

/**
 * A FEJLEC FO SAVJA.
 *
 * A komponens ASZINKRON szerver-komponens, ami regiot es kategoriakat hiv le --
 * jsdomban nem futtathato, tehat a forrasa merheto, nem a renderelt fa.
 *
 * AMIT EZ NEM BIZONYIT: hogy a lapon jol NEZ KI. Azt csak a kitelepitett lapon
 * lehet megnezni, es arra kulon merohely van.
 */
describe("a fejléc fő sávja", () => {
  const nav = forras("index.tsx")

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es tenyleg a fejlec az. */
  it("a forrás olvasható, és tényleg a fejléc", () => {
    expect(nav).toContain("export default async function Nav")
    expect(nav).toContain("SideMenu")
  })

  it("a fő sáv a tervbeli 78 pixel", () => {
    expect(nav).toContain("h-[78px]")
  })

  /**
   * A FELSO SAV NINCS MEGEPITVE, ES EZ ALLITAS, NEM ELMULASZTAS.
   *
   * Mind a harom szovege blokkolt (igeret, kulso adat, cel nelkuli link), es egy
   * ures 36 pixeles csik rosszabb, mint a hianya. Ha valaki egyszer megepiti,
   * ennek pirosodnia KELL -- akkor ujra el kell dontenie, van-e mar forrasa a
   * harom szovegnek.
   *
   * A POZITIV KONTROLL a fenti 78-as allitas: enelkul ez a sor egy URES
   * fajlon is zold lenne.
   */
  it("a felső 36 pixeles sáv NINCS megépítve", () => {
    expect(nav).not.toContain("h-[36px]")
    expect(nav).not.toContain("Árukereső")
  })

  it("a színek tokenből jönnek, nyers érték nélkül", () => {
    expect(nav).toContain("var(--terv-keret)")
    expect(nav).toContain("var(--terv-kiemel)")
    expect(nav).toContain("var(--terv-szoveg)")
    expect(nav.match(/oklch\(/g)).toBeNull()
  })
})

describe("a fejléc keresője", () => {
  const nav = forras("index.tsx")

  /**
   * A MEZO NEVE `q`, ES A CIM A `/store`. A ketto EGYUTT ad mukodo keresest: a
   * `/store` lap a `q` parametert olvassa. Ha barmelyik elcsuszik, a kereso NEM
   * hibazik -- a vevo egy szuretlen listan all, es nem tudja, miert.
   */
  it("a mező neve q, és az űrlap a /store lapra küld", () => {
    expect(nav).toContain('name="q"')
    expect(nav).toContain('method="get"')
    expect(nav).toContain("/store")
  })

  /**
   * A HELYKITOLTO A TERV SZOVEGE, es mind a harom igerete merve all a teszt
   * bolton (termek, marka/faj, cikkszam). Ha valaki atirja, ez pirosodik, es
   * akkor ujra le kell merni, hogy az uj szoveg igaz-e.
   */
  it("a helykitöltő szöveg a tervé", () => {
    expect(nav).toContain("Keresés termékre, márkára, cikkszámra")
  })

  /** A mezonek cimkeje is van, kulonben csak a helykitolto azonositja. */
  it("a mezőnek van címkéje", () => {
    expect(nav).toContain('htmlFor="fejlec-kereso-mezo"')
  })
})

describe("a kosár gomb felirata", () => {
  const kosar = forras("..", "..", "components", "cart-dropdown", "index.tsx")

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es ez a kosar-legordulo. */
  it("a forrás olvasható, és tényleg a kosár", () => {
    expect(kosar).toContain("CartDropdown")
    expect(kosar).toContain('data-testid="nav-cart-link"')
  })

  /**
   * MAGYARUL, ES A TERV ALAKJABAN. Eddig `Cart (0)` allt itt -- angolul, a lap
   * legjobban lathato pontjan. A tervbeli alak kozeppontot hasznal, nem
   * zarojelet.
   */
  it("a felirat magyar, a terv alakjában", () => {
    expect(kosar).toContain("Kosár · ${totalItems}")
    expect(kosar).not.toContain("Cart (")
  })
})
