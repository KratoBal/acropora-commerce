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
   *   2a (sotet)         hatter 0.62   a feliratot viselo elemek szovege 0.15
   *   1a + 1b (vilagos)  hatter 0.55   a feliratot viselo elemek szovege FEHER
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
})
