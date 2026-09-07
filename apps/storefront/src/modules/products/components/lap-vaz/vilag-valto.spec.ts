import { describe, expect, it } from "vitest"

import { ELO_ALLAT_GYOKEREK, vilagaTermeknek } from "./vilag-valto"

/**
 * A FIXTÚRÁK A STAGE VALÓDI ALAKJÁT KÖVETIK: a Medusa a termék kategóriái közt
 * az ŐSÖKET is felsorolja, `mpath`-tal együtt, tehát a gyökér ott van a listában.
 */
const termek = (katok: { name: string; mpath: string }[]) =>
  ({ categories: katok }) as never

const KORALL = termek([
  { name: "Korallok", mpath: "c_kor" },
  { name: "SPS - WYSIWYG", mpath: "c_kor.c_sps" },
])

const MUSZAKI = termek([
  { name: "Termékek", mpath: "c_term" },
  { name: "Tesztek, mérés, vezérlés - Termékek", mpath: "c_term.c_teszt" },
  { name: "TDS, Ph mérők - Tesztek", mpath: "c_term.c_teszt.c_tds" },
])

describe("melyik világot kapja egy termék", () => {
  it("a korall SÖTÉT lapot kap", () => {
    expect(vilagaTermeknek(KORALL)).toBe("sotet")
  })

  it("a műszaki termék VILÁGOSAT", () => {
    expect(vilagaTermeknek(MUSZAKI)).toBe("vilagos")
  })

  /**
   * MIND A HÁROM ÉLŐ ÁLLAT GYÖKÉR. A Halak és a Gerinctelenek alatt ma NULLA
   * termék áll (mérve 2026-09-07), tehát a valódi adaton ez a két ág nem
   * próbálható ki -- az állítás az egyetlen hely, ahol mégis mérhető.
   */
  it("mind a három élő állat gyökér sötétet ad", () => {
    /**
     * A HÁROM NÉV KIÍRVA, NEM A KONSTANSBÓL BEJÁRVA.
     *
     * Ezt a kalibráció hívta elő: az első alak a `ELO_ALLAT_GYOKEREK` listát
     * járta be, tehát azt validálta, amit a lista mond. Amikor a rontásban
     * KIVETTEM belőle a "Korallok"-at, ez az állítás ZÖLD MARADT -- egy
     * önhivatkozó állítás nem tud hiányzó elemet észrevenni.
     *
     * Így viszont mind a három név kimondva áll, és bármelyik eltűnése pirosat ad.
     */
    expect(vilagaTermeknek(termek([{ name: "Korallok", mpath: "c_x" }]))).toBe("sotet")
    expect(vilagaTermeknek(termek([{ name: "Halak", mpath: "c_x" }]))).toBe("sotet")
    expect(vilagaTermeknek(termek([{ name: "Gerinctelenek", mpath: "c_x" }]))).toBe("sotet")

    // és a lista sem tartalmazhat többet vagy kevesebbet
    expect([...ELO_ALLAT_GYOKEREK]).toEqual(["Korallok", "Halak", "Gerinctelenek"])
  })

  /**
   * A KÉT EGYELŐRE VILÁGOS ÁG. A döntés azon áll, hogy ma NULLA termék van
   * alattuk; ha valaha élő állat kerül oda, ez az állítás az a hely, ahol a
   * megfordítás látszani fog.
   */
  it("az Édesvízi és a Shop 'n the Shop egyelőre világos", () => {
    expect(vilagaTermeknek(termek([{ name: "Édesvízi akvarisztika", mpath: "c_e" }]))).toBe("vilagos")
    expect(vilagaTermeknek(termek([{ name: "Shop 'n the Shop", mpath: "c_s" }]))).toBe("vilagos")
  })

  /**
   * A GYÖKÉR SZÁMÍT, NEM A MÉLYEBB SZINT. Ha valaki egy MÉLYEBB kategóriát
   * nevezne el "Korallok"-nak (a fában van "SPS - WYSIWYG" és hasonló), az nem
   * teheti sötétté a lapot: a szabály a gyökérről szól.
   */
  it("egy mélyebb, azonos nevű kategória NEM vált világot", () => {
    const megteveszto = termek([
      { name: "Termékek", mpath: "c_term" },
      { name: "Korallok", mpath: "c_term.c_alkat" },
    ])
    expect(vilagaTermeknek(megteveszto)).toBe("vilagos")
  })

  /**
   * KATEGÓRIA NÉLKÜL VILÁGOS. Ez a biztonságos irány: a katalógus túlnyomó része
   * műszaki, és egy hiányzó besorolás miatt nem forgatjuk sötétbe a lapot.
   */
  it("kategória nélkül világos", () => {
    expect(vilagaTermeknek(termek([]))).toBe("vilagos")
    expect(vilagaTermeknek(null)).toBe("vilagos")
    expect(vilagaTermeknek(undefined)).toBe("vilagos")
  })
})
