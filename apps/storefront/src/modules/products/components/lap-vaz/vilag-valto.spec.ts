import { describe, expect, it } from "vitest"

import { ELO_ALLAT_GYOKEREK, vilagaTermeknek } from "./vilag-valto"

/**
 * A FIXTÚRÁK A STAGE VALÓDI ALAKJÁT KÖVETIK: a Medusa a termék kategóriái közt
 * az ŐSÖKET is felsorolja, `mpath`-tal együtt, tehát a gyökér ott van a listában.
 *
 * DE NEM MINDIG, ÉS EZ A FEJLÉC 2026-09-08-ig ezt az EGY alakot állította. Az
 * élő API-n mérve (2026-09-07) az egyik termék HAT kategóriát kapott a
 * gyökérrel együtt, egy másik CSAK EGYET: a levelet, három szintű `mpath`-tal,
 * szülő nélkül. A második alak fixtúrái lentebb állnak, és a váltó azokra is
 * helyes választ kell adjon -- enélkül egy élő állat csendben a világos
 * elrendezést kapja, a jelvényével együtt.
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
    expect(vilagaTermeknek(termek([{ name: "Korallok", mpath: "c_x" }]))).toBe(
      "sotet",
    )
    expect(vilagaTermeknek(termek([{ name: "Halak", mpath: "c_x" }]))).toBe(
      "sotet",
    )
    expect(
      vilagaTermeknek(termek([{ name: "Gerinctelenek", mpath: "c_x" }])),
    ).toBe("sotet")

    // és a lista sem tartalmazhat többet vagy kevesebbet
    expect([...ELO_ALLAT_GYOKEREK]).toEqual([
      "Korallok",
      "Halak",
      "Gerinctelenek",
    ])
  })

  /**
   * A KÉT EGYELŐRE VILÁGOS ÁG. A döntés azon áll, hogy ma NULLA termék van
   * alattuk; ha valaha élő állat kerül oda, ez az állítás az a hely, ahol a
   * megfordítás látszani fog.
   */
  it("az Édesvízi és a Shop 'n the Shop egyelőre világos", () => {
    expect(
      vilagaTermeknek(
        termek([{ name: "Édesvízi akvarisztika", mpath: "c_e" }]),
      ),
    ).toBe("vilagos")
    expect(
      vilagaTermeknek(termek([{ name: "Shop 'n the Shop", mpath: "c_s" }])),
    ).toBe("vilagos")
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

/**
 * A LEVELES ALAK: A TERMEK CSAK A SAJAT KATEGORIAJAT HOZZA, OS NELKUL.
 *
 * Ez a mert masodik alak. A gyoker azonositoja benne van az `mpath`-ban (az
 * elso szegmens), de a NEVE nincs sehol a termek sajat listajaban -- azt csak a
 * teljes kategoria-lista tudja megmondani. A termeklap ezt amugy is lekeri.
 */
const LEVELES_KORALL = termek([
  { name: "SPS - WYSIWYG", mpath: "c_kor.c_sps" } as never,
])

const LEVELES_MUSZAKI = termek([
  { name: "TDS, Ph mérők - Tesztek", mpath: "c_term.c_teszt.c_tds" } as never,
])

/** Ugyanaz, `mpath` NELKUL: a szulo-lancon kell felmenni. */
const LEVELES_MPATH_NELKUL = {
  categories: [
    { id: "c_sps", name: "SPS - WYSIWYG", parent_category_id: "c_kor" },
  ],
} as never

const KATALOGUS = [
  { id: "c_kor", name: "Korallok", parent_category_id: null },
  { id: "c_sps", name: "SPS - WYSIWYG", parent_category_id: "c_kor" },
  { id: "c_term", name: "Termékek", parent_category_id: null },
  {
    id: "c_teszt",
    name: "Tesztek, mérés, vezérlés - Termékek",
    parent_category_id: "c_term",
  },
  {
    id: "c_tds",
    name: "TDS, Ph mérők - Tesztek",
    parent_category_id: "c_teszt",
  },
]

describe("a gyökér feloldása, ha a termék nem hozta magával", () => {
  /**
   * ISMERT POZITIV KONTROLL, ES ITT KETTOS SZEREPE VAN.
   *
   * Egyreszt bizonyitja, hogy a fixtura tenyleg a LEVELES alak: katalogus
   * nelkul VILAGOS jon ra, vagyis a regi ut nem tudja megoldani. Masreszt
   * rogziti, hogy a katalogus nelkuli viselkedes BETURE a mai maradt -- aki nem
   * ad at listat, ugyanazt kapja, mint eddig.
   */
  it("katalógus nélkül a leveles korall VILÁGOS marad, ahogy eddig", () => {
    expect(vilagaTermeknek(LEVELES_KORALL)).toBe("vilagos")
  })

  it("leveles kategóriánál a katalógusból oldja fel a gyökeret", () => {
    expect(vilagaTermeknek(LEVELES_KORALL, KATALOGUS)).toBe("sotet")
  })

  it("mpath nélkül a szülő-láncon találja meg a gyökeret", () => {
    expect(vilagaTermeknek(LEVELES_MPATH_NELKUL, KATALOGUS)).toBe("sotet")
  })

  /**
   * A HATAR, ES EZ AZ ALLITAS AZ, AMI NELKUL A TOBBI SEMMIT NEM ER.
   *
   * A feloldas csak HOZZAAD: egy leveles muszaki termek gyokere `Termékek`,
   * ami nem elo allat, tehat VILAGOS marad. Enelkul a fenti ket allitas azzal
   * a valtozattal is zold lenne, ami MINDENT sotetnek mond.
   */
  it("leveles kategória NEM élő állat gyökér alatt világos marad", () => {
    expect(vilagaTermeknek(LEVELES_MUSZAKI, KATALOGUS)).toBe("vilagos")
  })

  /** A teljes os-lancnal a katalogus nem valtoztat semmin. */
  it("a teljes ős-lánccal a katalógus nem mozdít a válaszon", () => {
    expect(vilagaTermeknek(KORALL, KATALOGUS)).toBe("sotet")
    expect(vilagaTermeknek(MUSZAKI, KATALOGUS)).toBe("vilagos")
  })
})
