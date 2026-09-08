import { readFileSync } from "node:fs"
import { join } from "node:path"

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
   *
   * ES EZ NEM ELMELETI HATAR -- MERVE (acrobot, 2026-09-08 03:02, teszt bolt,
   * 1492 termek): otvenkilenc termeknek van ugy kategoriaja, hogy nincs kozte
   * gyoker-elem, es ebbol OTVENNYOLC NEM elo allat. Vagyis ez az egy allitas
   * otvennyolc valodi lapot ved meg attol, hogy sotetre valtson.
   *
   * Ha a javitas utan a sotet lapok szama tobb lenne, mint 161, akkor pont ez
   * a hatar engedett.
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

/**
 * A HIVAS OBJEKTUMANAK SZELETE, KAPCSOS ZAROJEL SZAMLALASSAL.
 *
 * A `fuggveny({` elso elofordulasatol a HOZZA TARTOZO zaro `}`-ig ad vissza,
 * a mélységet szamolva -- tehat a hivas objektuma akkor is egyben marad, ha
 * belsejeben zarojeles kifejezes, beagyazott objektum vagy tomb all.
 *
 * MIERT NEM ELEG AZ ELSO `)`: lasd a kalibraciot a describe aljan. Roviden:
 * egy `fields: mezoket()` alak eseten az elso `)` a MEZOLISTA zarojele, nem a
 * hivase, es minden utana allo mezo (koztuk a `limit`) kimarad a szeletbol.
 *
 * A HATARA, hogy ez SZOVEGET olvas, nem szintaxisfat: egy sztring-literalban
 * allo kapcsos zarojel felrevinne. A vizsgalt hivasokban ilyen nincs, es ha
 * valaha lesz, ez a fuggveny az a hely, ahol kiderul.
 */
function hivasObjektuma(forras: string, fuggveny: string): string {
  const kezd = forras.indexOf(`${fuggveny}({`)
  if (kezd < 0) return ""

  const nyit = forras.indexOf("{", kezd)
  let melyseg = 0

  for (let i = nyit; i < forras.length; i += 1) {
    if (forras[i] === "{") melyseg += 1
    else if (forras[i] === "}") {
      melyseg -= 1
      if (melyseg === 0) return forras.slice(nyit, i + 1)
    }
  }

  return forras.slice(nyit)
}

/**
 * A KATALOGUS CSAK AKKOR TELJES, HA A HIVO NEM AD `limit`-ET.
 *
 * A gyoker feloldasa a teljes kategoria-listan all: az `mpath` elso szegmense
 * egy AZONOSITO, es a nevet csak a katalogusbol lehet megkapni. Ha a lista
 * hianyos, a keresett gyoker egyszeruen nincs benne.
 *
 * ES A `listCategories` CSAK LIMIT NELKUL LAPOZ VEGIG (a `lib/data/categories`
 * a hivo `limit` mezojet nezi: ha kap egyet, EGY lapot ad vissza, egyebkent
 * mind a 219 kategoriat). Vagyis ha valaha valaki limitet tesz a termeklap
 * hivasaba, a feloldas NEM hibara fut -- csendben visszaall a javitas ELOTTI
 * viselkedesre: a gyoker nem talalhato, es a lap VILAGOS lesz.
 *
 * A KAR NEM ELMELETI: egy igy felresorolt elo allat nem csak a muszaki
 * elrendezest kapja, hanem elveszti a JELVENYT es az IGERETET is -- a
 * `galeriatAdunkAt` ugyanezen a fuggvenyen all.
 *
 * (acrobot merese, 2026-09-08 03:02, a teszt bolton: o nevezte meg ezt a
 * kockazatot, es o merte meg, hogy a mai hivas limit nelkul all.)
 *
 * A HATAR: ez a spec a FORRAST olvassa. Azt bizonyitja, hogy a hivas nem KER
 * limitet, nem azt, hogy a valasz teljes volt.
 */
describe("a katalógus, amiből a gyökér feloldódik", () => {
  const lapForras = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "app",
      "[countryCode]",
      "(main)",
      "products",
      "[handle]",
      "page.tsx",
    ),
    "utf-8",
  )

  /**
   * ISMERT POZITIV KONTROLL: a hivas tenyleg ott van, es tenyleg ezt a fajlt
   * olvassuk.
   *
   * ES EZ A SOR NEM FELESLEGES, HABAR ANNAK LATSZIK. A `hivasObjektuma` URES
   * sztringet ad, ha nem talal `listCategories({` alakot -- egy szokoz is eleg
   * hozza (`listCategories( {`). Egy ures sztring pedig nem tartalmaz
   * `limit`-et, tehat az alatta allo allitas NEMAN atmenne.
   *
   * Ha valaha takaritas folyik ebben a fajlban: ez a sor marad. (acrobot
   * talalta, msg 15047 -- o kereste a lyukat, es azt latta, hogy mar be van
   * zarva, csak nem ott, ahol nezte.)
   */
  it("a terméklap forrásában ott a listCategories hívás", () => {
    expect(lapForras).toContain("listCategories({")
    expect(lapForras).toContain("parent_category_id")
  })

  it("a terméklap a TELJES katalógust kéri, limit nélkül", () => {
    const hivas = hivasObjektuma(lapForras, "listCategories")

    /**
     * AZ URES SZELET KIZARASA, UGYANEBBEN AZ ALLITASBAN.
     *
     * A fenti pozitiv kontroll ezt MA is megfogja -- de az egy MASIK teszt, es
     * egy kesobbi olvaso torolheti "duplikatumkent". Ez a sor helyben teszi
     * szerkezetive: ha a szeletelo nem talal semmit, EZ az allitas bukik el,
     * nem egy masik.
     *
     * A ket vedelem nem duplikatum: a kontroll a FAJLROL allit (ott van-e a
     * hivas), ez a SZELETELOROL (talalt-e valamit). Ket kulonbozo hiba.
     */
    expect(hivas.length).toBeGreaterThan(0)
    expect(hivas).not.toContain("limit")
  })

  /**
   * A SZELETELO KALIBRACIOJA -- MAGAT A MEROT MERI, NEM A LAPOT.
   *
   * Az elso alak az ELSO `)`-ig vagott. Ma az veletlenul a hivas zaro
   * zarojele volt, tehat mukodott. De ha barmi zarojeles kerul a `limit` ELE
   * az objektumban, a szelet ott er veget, es a `limit` KIMARAD a vizsgalt
   * szovegbol -- vagyis az allitas zold marad, mikozben a lap egyetlen lapot
   * ker. Pont az a viselkedes, ami ellen az orzo epult, es pont olyan neman.
   *
   * ES EZ NEM ELMELETI EBBEN A REPOBAN: van `lib/data/termeklap-fields.ts`,
   * tehat a "mezolista fuggvenybol jon" alak a haz szokasa, nem kitalalt eset.
   *
   * A ket allitas EGYUTT bizonyit, es ezert all mind a ketto itt:
   * az UJ alak megtalalja a limitet a romlott forrasban, a REGI alak pedig
   * NEM talalja meg. Az elso magaban csak annyit mondana, hogy a szeletelo
   * mukodik; a masodik nevezi meg, mi volt a vaksag, amit lezar.
   *
   * (acrobot merese, 2026-09-08 05:16, msg 15007 -- o szimulalta a valodi
   * fajlon, es o nevezte meg a javitas alakjat is.)
   */
  it("a szeletelő a limitet zárójeles kifejezés MÖGÖTT is megtalálja", () => {
    const romlott =
      "const kategoriak = await listCategories({ fields: mezoket(), limit: 5 })"

    expect(hivasObjektuma(romlott, "listCategories")).toContain("limit")

    const regiAlak = romlott.slice(
      romlott.indexOf("listCategories({"),
      romlott.indexOf(")", romlott.indexOf("listCategories({")),
    )
    expect(regiAlak).not.toContain("limit")
  })
})
