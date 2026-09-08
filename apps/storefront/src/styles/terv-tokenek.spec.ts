import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A TERV ERTEKEI, ALLITASKENT -- MERT EDDIG CSAK LE VOLTAK IRVA.
 *
 * === MIERT LETEZIK EZ A FAJL ===
 *
 * Balazs a kilenc erteket megerositette (acrobot atadasaban, 2026-09-07), es
 * kulon kikototte, hogy a sotet akcent "SZANDEKOSAN mas, ne egysegesitsd".
 *
 * Lemertem: EGYETLEN spec fajl sem olvasta a `globals.css`-t. A kikotes tehat
 * DOKUMENTACIO volt, nem vedelem -- aki holnap "egyszerusit", csendben
 * egysegesiti a ket erteket, es semmi nem szol. Ugyanaz az alak, amit ez a repo
 * mar tobbszor gyujtott: egy kimondott szandek, ami melle nem all allitas.
 *
 * === MIT MER, ES MIT NEM ===
 *
 * A CSS SZOVEGET olvassa, nem a kiszamolt stilust: a jsdom nem szamol
 * elrendezest, es egy tokentol nem is azt varjuk. Vagyis azt allitja, hogy az
 * ERTEKEK ott vannak es a szerepek nem csusztak ossze -- NEM azt, hogy egy
 * adott elem tenyleg azt a szint viseli. Az utobbi kulon kerdes, es a lapon
 * merheto.
 */
const CSS = readFileSync(join(__dirname, "globals.css"), "utf-8")

/**
 * SZOKOZ-FUGGETLEN OSSZEVETES, ES EZ NEM KENYELMI KERDES.
 *
 * A prettier SZETTORI az erteket, ha a sor tul hosszu lesz:
 *
 *   --terv-hatter: oklch(
 *     0.96 0.006 75
 *   );
 *
 * Egy egyszeru `\s+ -> " "` csere ilyenkor `oklch( 0.96 0.006 75 )` alakot ad,
 * ami NEM illeszkedik -- es a haló FALSE POZITIVET adna: pirosra valtana egy
 * olyan valtozastol, ami csak a formazas. Merve: ez ma este meg is tortent,
 * egy hosszabb komment miatt.
 *
 * Ezert a zarojelen BELULI szokozok is kiesnek. Ettol nem lesz lazabb: az
 * ertekek szamjegyei es a sorrendjuk valtozatlanul szamit.
 */
const normal = (s: string) =>
  s.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")")

describe("a terv megerositett ertekei", () => {
  /**
   * ISMERT POZITIV KONTROLL. Ha a fajlt rossz utrol olvasnank, vagy uresen
   * jonne vissza, MINDEN alabbi allitas zold lenne -- egy `toContain` ures
   * szovegen nem bukik el, csak ha van mit keresni benne. Ez a sor mondja meg,
   * hogy a bemenet egyaltalan letezik.
   */
  it("a stíluslap beolvasható, és tokeneket tartalmaz", () => {
    expect(CSS.length).toBeGreaterThan(1000)
    expect(CSS).toContain("--terv-hatter")
  })

  /**
   * A KILENC ERTEK, SZEREPENKENT. A szerep is szamit, nem csak az ertek: egy
   * "megvan valahol" allitas akkor is zold lenne, ha a ket akcent helyet
   * cserelne.
   */
  const PAROK: ReadonlyArray<readonly [string, string]> = [
    ["--terv-hatter", "oklch(0.96 0.006 75)"],
    ["--terv-szoveg", "oklch(0.2 0.012 60)"],
    ["--terv-keret", "oklch(0.88 0.005 250)"],
    ["--terv-keret-meleg", "oklch(0.88 0.008 70)"],
    ["--terv-kiemel", "oklch(0.55 0.13 45)"],
    ["--terv-kiemel-szoveg", "oklch(1 0 0)"],
    ["--terv-kiemel-tinta", "oklch(0.55 0.13 45)"],
  ]

  /**
   * A KERESES A VILAGOS BLOKKRA SZUKUL, ES EZT EGY KALIBRACIO KENYSZERITETTE KI.
   *
   * Eddig ez a sor a TELJES fajlban keresett, holott "vilagos modban" allit.
   * Amig minden token neve vilagonkent kulonbozott, ez nem latszott. A ket
   * rez-valtozo egybevonasa utan viszont ugyanaz a NEV all mind a ket
   * blokkban -- es amikor probakeppen FELCSERELTEM a ket blokk rez-erteket,
   * ez a sor ZOLD MARADT: a keresett `0.55` ott volt, csak a MASIK blokkban.
   *
   * Vagyis egy tul TAG kereses nem hibazik, hanem csendben atmegy. A szukites
   * mind a het sort erositi, nem csak a rezet: ugyanez a lyuk allt a
   * hatterre, a szovegre es a keretekre is.
   */
  const VILAGOS_BLOKK = CSS.slice(0, CSS.indexOf('[data-vilag="sotet"]'))

  it.each(PAROK)("világos módban %s = %s", (nev, ertek) => {
    expect(normal(VILAGOS_BLOKK)).toContain(`${nev}: ${ertek}`)
  })

  /**
   * BALAZS KIKOTESE, ALLITASKENT: a ket akcent SZANDEKOSAN kulonbozik.
   *
   * Ez a keszlet legfontosabb sora, mert a kesobbi "egyszerusites" pontosan ezt
   * a kulonbseget vinne el -- es a kulonbseg elvesztese NEM hibazik: a lap
   * tovabb mukodik, csak egy arnyalattal mast mutat. Nema kar.
   *
   * A KIKOTES VALTOZATLAN, A MERES MODJA VALTOZOTT (2026-09-08). Eddig ez a sor
   * KET VALTOZONEVET hasonlitott ossze (`--terv-kiemel` es
   * `--terv-kiemel-sotet`), mind a kettot ugyanabban a `:root` blokkban. A ket
   * rez-valtozo azota egybe kerult, tehat a ket ertek most ugyanazon a NEVEN
   * all, ket kulonbozo BLOKKBAN -- a regi regex-par erre vakon nullat adna.
   *
   * Ez a valtozat ERISEBB, mint a regi: nem csak azt mondja, hogy a ketto
   * kulonbozik, hanem azt is, MELYIK MELYIK. A puszta "nem egyenlo" alak akkor
   * is zold maradna, ha a ket vilag rezje HELYET CSERELNE -- es az pontosan az
   * a nema kar, amirol a fenti bekezdes szol.
   */
  it("a világos és a sötét akcent NEM ugyanaz az érték", () => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')
    expect(sotetKezd).toBeGreaterThan(-1)

    const vilagosBlokk = CSS.slice(0, sotetKezd)
    const sotetBlokk = CSS.slice(sotetKezd)

    const kiemel = (blokk: string) =>
      /--terv-kiemel:\s*(oklch\([^)]+\))/.exec(blokk)?.[1]

    const vilagos = kiemel(vilagosBlokk)
    const sotet = kiemel(sotetBlokk)

    expect(vilagos).toBe("oklch(0.55 0.13 45)")
    expect(sotet).toBe("oklch(0.62 0.13 45)")
    expect(vilagos).not.toBe(sotet)
  })

  /**
   * A SOTET VILAG SAJAT KESZLETE. A `[data-vilag="sotet"]` blokk NEM
   * prefers-color-scheme: a termek fajtaja donti el, nem a latogato
   * beallitasa -- ezert kell sajat blokk, es ezert allitas is ra.
   */
  it("a sötét világnak saját érték-készlete van", () => {
    expect(CSS).toContain('[data-vilag="sotet"]')

    const sotetBlokk = CSS.slice(CSS.indexOf('[data-vilag="sotet"]'))
    expect(normal(sotetBlokk)).toContain("--terv-hatter: oklch(0.235 0.02 248)")
    expect(normal(sotetBlokk)).toContain("--terv-szoveg: oklch(0.95 0.006 250)")
    expect(normal(sotetBlokk)).toContain("--terv-keret: oklch(0.28 0.014 250)")
  })

  /**
   * A REZEN ALLO SZOVEG MEGFORDUL A KET VILAG KOZOTT -- ES EZ AZ ALLITAS
   * KORABBAN AZ ELLENKEZOJET MONDTA.
   *
   * Itt az allt, hogy "feher SEHOL nem all rezen", a kilenc rez hatteru elem
   * merese alapjan. Az a meres a terv SOTET (2a) lapjan keszult: a tervfajl
   * harom lapot tartalmaz egymas alatt, es a "kilenc" egyetlen lapra
   * vonatkozott. Szakaszonkent ujramerve, mindket szakaszban kilenc rez elem,
   * szakaszon belul nulla kivetellel:
   *
   *   2a (sotet)    hatter 0.62   a feliratot viselo elemek szovege 0.15
   *   1b (vilagos)  hatter 0.55   a feliratot viselo elemek szovege FEHER
   *   1a            NULLA rez hatteru elem
   *
   * A VILAGOS KILENC EGYETLEN LAPON ALL (1b), es itt 2026-09-08-ig "1a + 1b"
   * allt. Az 1a lapon nincs rez felulet -- a kiolvasasban 156 eleme van, tehat
   * a nulla nem az adat hianya. A kovetkeztetes valtozatlan.
   *
   * A kontraszt tehat tovabbra is a REZHEZ szol -- csak a ket vilag rezje
   * kulonbozik, ezert a rajta allo szoveg is.
   *
   * EZ AZ ALLITAS AZERT ALL ITT MEGFORDITVA, es nem torolve: ha valaki
   * "egysegesiti" a ket erteket, ugyanugy pirosra valt, mint korabban a
   * megforditas. A vedelem iranya valtozott, a vedelem maga nem.
   */
  it("a rézen álló szöveg a két világban KÜLÖNBÖZIK", () => {
    const talalatok = CSS.match(/--terv-kiemel-szoveg:\s*oklch\([^)]+\)/g) ?? []

    expect(talalatok).toHaveLength(2)
    expect(new Set(talalatok).size).toBe(2)

    // es nev szerint, hogy egy elgepeles ne csak "kulonbozo"-t adjon
    const sotetBlokk = CSS.slice(CSS.indexOf('[data-vilag="sotet"]'))
    expect(normal(sotetBlokk)).toContain(
      "--terv-kiemel-szoveg: oklch(0.15 0.014 45)",
    )
  })

  /**
   * A REZ TINTA MIND A KET VILAGBAN DEFINIALT -- ES EZT MERT RES ZARJA BE.
   *
   * A bejaro halo (`terv-token-hasznalat.spec.ts`) azt kerdezi, hogy egy
   * HASZNALT token letezik-e valahol. Lemertem, mit NEM lat: a sotet blokkbol
   * kitorolve a definiciot 273 teszt fut le es NULLA piros -- mert a vilagos
   * definicio ott marad, tehat a token "letezik".
   *
   * A KAR VISZONT NEMA ES LATHATO: a sotet lapon a telefonszam a vilagos
   * erteket (0.55) orokolne 0.68 helyett -- halvanyabban, sotet hatteren, es
   * semmi nem szolna. Pontosan az az alak, amit ez a fajl gyujt.
   *
   * Ezert all itt nev szerint MIND A KET ertek. A ket szam kulonbsege nem
   * elirás: a `--terv-kiemel` FELULET (a gomb all rajta), ez pedig TINTA (a
   * szoveg all benne), es a ket szerep a sotet lapon szetvalik.
   */
  it("a réz TINTA mind a két világban definiált, saját értékkel", () => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')
    const vilagosBlokk = normal(CSS.slice(0, sotetKezd))
    const sotetBlokk = normal(CSS.slice(sotetKezd))

    expect(vilagosBlokk).toContain("--terv-kiemel-tinta: oklch(0.55 0.13 45)")
    expect(sotetBlokk).toContain("--terv-kiemel-tinta: oklch(0.68 0.13 45)")
  })
})

/**
 * A REZ KET SZEREPE -- ES AZ ALLITAS, AMI A SOTET LAPON SZETVALASZTJA OKET.
 *
 * A tervben a rez FELULETKENT es SZOVEGKENT is szerepel, es a ket ertek a
 * sotet lapon KULONBOZIK:
 *
 *   2a (sotet)    felulet 0.62   a lapon allo rez szoveg 0.68   (9 elem)
 *   1b (vilagos)  felulet 0.55   a lapon allo rez szoveg 0.55   (8 elem)
 *
 * A VILAGOS LAPON EGYBEESNEK, es epp ezert kell allitas ra: egy vilagos lapon
 * merve a ket szerep egy tokennek latszik, es a szetvalasztas "folosleges
 * bonyolitasnak". A kulonbseg csak a soteten latszik.
 *
 * MIERT BLOKKONKENT, ES NEM A TELJES FAJLBAN: egy teljes fajlra szolo kereses
 * a 0.68-at a vilagos blokkban is megtalalna, ha valaki oda irja -- es akkor az
 * allitas pont azt nem venne eszre, amit vedeni akar.
 */
describe("a réz két szerepe", () => {
  const sotetKezd = () => CSS.indexOf('[data-vilag="sotet"]')

  const ertek = (blokk: string, nev: string) =>
    new RegExp(`${nev}:\\s*(oklch\\([^)]+\\))`).exec(blokk)?.[1]

  it("sötét módban --terv-kiemel-tinta = oklch(0.68 0.13 45)", () => {
    const sotetBlokk = CSS.slice(sotetKezd())

    expect(ertek(sotetBlokk, "--terv-kiemel-tinta")).toBe("oklch(0.68 0.13 45)")
  })

  it("a réz tinta és a réz felület a sötét lapon KÜLÖNBÖZIK", () => {
    const sotetBlokk = CSS.slice(sotetKezd())

    const felulet = ertek(sotetBlokk, "--terv-kiemel")
    const tinta = ertek(sotetBlokk, "--terv-kiemel-tinta")

    expect(felulet).toBe("oklch(0.62 0.13 45)")
    expect(tinta).toBe("oklch(0.68 0.13 45)")
    expect(felulet).not.toBe(tinta)
  })

  /**
   * ES A VILAGOS LAPON EGYBEESNEK -- ez nem elirás, hanem a terv. Enelkul
   * valaki "kijavitana" a vilagos tintat egy masik ertekre, hogy "kovetkezetes"
   * legyen a sotettel.
   */
  it("a világos lapon a két szerep SZÁNDÉKOSAN egybeesik", () => {
    const vilagosBlokk = CSS.slice(0, sotetKezd())

    expect(ertek(vilagosBlokk, "--terv-kiemel")).toBe("oklch(0.55 0.13 45)")
    expect(ertek(vilagosBlokk, "--terv-kiemel-tinta")).toBe(
      "oklch(0.55 0.13 45)",
    )
  })
})
