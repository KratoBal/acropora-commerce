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
