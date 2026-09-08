import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import { keresesSzovege } from "@lib/util/kereses"

const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/**
 * A KERESES SZOVEGENEK KIOLVASASA.
 *
 * Ez az EGYETLEN hely, ahol a nyers `searchParams` ertek ertelmezodik, es harom
 * dontes all benne, amik kozul egyik sem magatol ertetodo. Ezert van rajta
 * allitas: mind a harom CSENDBEN mast csinalna, ha elcsuszna.
 */
describe("a keresés szövegének kiolvasása", () => {
  it("egy sima szöveget változatlanul ad vissza", () => {
    expect(keresesSzovege("korall")).toBe("korall")
  })

  /**
   * TOMBBOL AZ ELSO, NEM OSSZEFUZVE. A `?q=a&q=b` alak tombot ad. Egy
   * osszefuzott kereses ("ab") NEM hibazna, csak mast keresne -- es a vevo nem
   * tudna, miert nem talalja, amit beirt.
   */
  it("tömbből az elsőt veszi, nem fűzi össze", () => {
    expect(keresesSzovege(["korall", "hal"])).toBe("korall")
  })

  it("a körülvevő szóközöket levágja", () => {
    expect(keresesSzovege("  korall  ")).toBe("korall")
  })

  /**
   * A CSUPA SZOKOZ URES KERESES, NEM "SZOKOZ" KERESES. Enelkul a bolt egy
   * veletlen szokozre nulla talalatot adna, holott a vevo minden termeket var.
   */
  it("a csupa szóköz üres keresésnek számít", () => {
    expect(keresesSzovege("   ")).toBeUndefined()
    expect(keresesSzovege("")).toBeUndefined()
    expect(keresesSzovege(undefined)).toBeUndefined()
    expect(keresesSzovege([])).toBeUndefined()
  })
})

/**
 * A LANC MASIK KET SZEME, FORRAS-OLVASASSAL.
 *
 * A lekerdezes egy ASZINKRON szerver-komponensben all, ami adatot hiv le --
 * jsdomban nem futtathato. A `kodSzoveg` kiszedi a megjegyzeseket, tehat az a
 * bekezdes, amelyik a `q` merest INDOKOLJA, nem elegiti ki sajat magat.
 */
/**
 * A LANC KET VARRATA -- ES EZEK NELKUL A KERESES NEMAN MEGSZUNHET.
 *
 * MIERT KERULT IDE (nautilus modszerevel, 2026-09-08): a lekerdezesre allo
 * allitas a `paginated-products.tsx` FORRASAT olvassa. Az a fajl akkor is
 * valtozatlan marad, ha a HIVOJA nem adja at az erteket -- vagyis a szures
 * megszunik, es minden allitasom zold marad.
 *
 * LEMERTEM, nem feltetelezem: a `kereses={kereses}` propot kivettem a
 * sablonbol, es MIND A TIZENHAROM teszt zold maradt. A varrat fedetlen volt.
 *
 * Ez ugyanaz az alak, amit nautilus a vetites runnerenel talalt: ott a
 * modul-szintu import miatt nem futott a torzs, itt a forras-olvasas miatt nem
 * latszik a hivo. Mind a ketto NULLA pirosat ad, es mind a ketto ugy nez ki,
 * mintha a kod lenne merhetetlen -- holott a MERES nem eri el a varratot.
 *
 * KET allitas all itt, nem egy: a lanc KET szemen csuszhat el, es egy kozos
 * allitas nem mondana meg, MELYIKEN.
 */
describe("a keresés eljut a hívóktól a lekérdezésig", () => {
  const sablon = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))
  const utvonal = kodSzoveg(
    readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "app",
        "[countryCode]",
        "(main)",
        "store",
        "page.tsx",
      ),
      "utf-8",
    ),
  )

  /** ISMERT POZITIV KONTROLL: mind a ket fajlt beolvastuk, es ezek azok. */
  it("mindkét hívó forrása olvasható", () => {
    expect(sablon).toContain("StoreTemplate")
    expect(utvonal).toContain("StorePage")
  })

  /**
   * HAROM ALLITAS, MERT A LANCNAK HAROM SZEME VAN -- es a kalibracio mondta meg,
   * hogy ketto keves. Az elso alakban egy allitas mondta ki, hogy az utvonal
   * KISZAMOLJA es AT IS ADJA a keresest; ket kulonbozo rontas ugyanazt a nevet
   * dontotte pirosra, tehat a nev nem mondta meg, MELYIK szemen csuszott el.
   */
  it("az útvonal kiszámolja a keresést", () => {
    expect(utvonal).toContain("keresesSzovege(searchParams.q)")
  })

  /**
   * AZ ATADAST AZ ELEMHEZ KOTVE MERJUK, NEM A FAJL SZOVEGEBEN.
   *
   * A `kereses={kereses}` sztring onmagaban csak annyit mond, hogy VALAHOL a
   * fajlban all egy ilyen atadas. Ma mind a ket lapon EGY fogyaszto van, tehat
   * nem tud rossz helyre csuszni -- de ha egy masodik komponens is megkapja a
   * keresest, a sztring AZON is teljesulne, mikozben a cimzett (StoreTemplate,
   * illetve PaginatedProducts) mar nem kapna meg.
   *
   * Nautilus vetette fel a varrat-kerdest, es a leletet en mertem hozza: ez az
   * a szem, ahol az atadas es a CIMZETT valik szet. A javitas egy sor -- a
   * hatokor a cimzett nyito tagja, nem a fajl.
   *
   * (Ugyanaz az alak, mint a lablec racs-tagadasanal es a kosarsor csipjeinél:
   * az ellenorzes annyira szuk, amennyire a KERESESE.)
   */
  const elemBlokk = (forras: string, elem: string) => {
    const kezdet = forras.indexOf(`<${elem}`)
    return kezdet < 0 ? "" : forras.slice(kezdet, forras.indexOf("/>", kezdet))
  }

  it("az útvonal a SABLONNAK adja át a keresést", () => {
    const blokk = elemBlokk(utvonal, "StoreTemplate")

    expect(blokk).not.toBe("")
    expect(blokk).toContain("kereses={kereses}")
  })

  it("a sablon a LEKÉRDEZÉSNEK adja át a keresést", () => {
    const blokk = elemBlokk(sablon, "PaginatedProducts")

    expect(blokk).not.toBe("")
    expect(blokk).toContain("kereses={kereses}")
  })
})

describe("a keresés eljut a lekérdezésig", () => {
  const forras = kodSzoveg(
    readFileSync(join(__dirname, "paginated-products.tsx"), "utf-8"),
  )

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es tenyleg ez az. */
  it("a forrás olvasható, és tényleg a lapozott lista", () => {
    expect(forras).toContain("PaginatedProducts")
    expect(forras).toContain("listProductsWithSort")
  })

  it("a keresés a lekérdezés paraméterei közé kerül", () => {
    expect(forras).toContain('queryParams["q"] = kereses')
  })

  /**
   * A NULLA TALALAT KERESESKOR MONDATOT AD, NEM URES LAPOT -- es ez a doboz
   * legfontosabb allitasa. Kereses NELKUL a `null` a helyes valasz, es az is
   * marad: az ELSO sor a feltetel, a masodik a mondat.
   */
  it("nulla találatnál keresés esetén mondat áll, egyébként null", () => {
    expect(forras).toContain("if (!kereses) return null")
    expect(forras).toContain('data-testid="kereses-nincs-talalat"')
  })
})
