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
const SAJAT_FORRAS = readFileSync(__filename, "utf-8")

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
    ["--terv-hatter-halvany", "oklch(0.955 0.004 250)"],
    ["--terv-szoveg-halvany", "oklch(0.5 0.012 60)"],
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
   * A KET HALVANY TOKEN ERTEKE VILAGONKENT, NEV SZERINT.
   *
   * MIERT KERULT BE (murena merese, 2026-09-08): a komponens-tesztek het helyen
   * allitanak `var(--...)` erteket, es a jsdom NEM oldja fel a valtozot, tehat
   * azok a NEVET merik, nem az erteket. Ez onmagaban nem baj, amig a lanc masik
   * fele -- ez a fajl -- megmondja, mit jelent a nev. Otre megmondta. KETTORE
   * NEM: a `--terv-hatter-halvany` es a `--terv-szoveg-halvany` erteket eddig
   * SEMMI nem allitotta, egyik vilagban sem.
   *
   * VAGYIS A LANC MIND A KET VEGEN NYITVA VOLT: a komponens bizonyitotta, hogy
   * a helyes nevre hivatkozik, es semmi nem bizonyitotta, hogy a nev barmit is
   * jelent. Ket allitas, egyutt nulla fedes.
   *
   * ES EZ NEM MELLEKES TOKEN: a `--terv-szoveg-halvany` a fa legtobbet
   * hasznalt terv-valtozoja, HUSZONEGY hivohellyel a kosarban es a
   * termeklapon. Mind a ketto MINDKET blokkban ujra van definialva, tehat
   * ugyanaz a "egy nev, ket blokk" helyzet all rajtuk, ami ma este a PAROK
   * sorait csendben halotta tette.
   *
   * A NEV SZERINTI ALAK KELL, NEM A PUSZTA "kulonbozik": egy helycsere is
   * kulonbozo maradna, es a sotet lapon vilagos hatter allna. Ugyanaz az ok,
   * amiert a rez-allitas is megmondja, MELYIK MELYIK.
   */
  it("a két halvány token értéke világonként KÜLÖNBÖZIK, név szerint", () => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')
    expect(sotetKezd).toBeGreaterThan(-1)

    const vilagosBlokk = normal(CSS.slice(0, sotetKezd))
    const sotetBlokk = normal(CSS.slice(sotetKezd))

    expect(vilagosBlokk).toContain(
      "--terv-hatter-halvany: oklch(0.955 0.004 250)",
    )
    expect(sotetBlokk).toContain(
      "--terv-hatter-halvany: oklch(0.205 0.018 249)",
    )

    expect(vilagosBlokk).toContain("--terv-szoveg-halvany: oklch(0.5 0.012 60)")
    expect(sotetBlokk).toContain("--terv-szoveg-halvany: oklch(0.72 0.012 250)")
  })

  /**
   * A SOTET VILAG SAJAT KESZLETE. A `[data-vilag="sotet"]` blokk NEM
   * prefers-color-scheme: a termek fajtaja donti el, nem a latogato
   * beallitasa -- ezert kell sajat blokk, es ezert allitas is ra.
   */
  /**
   * A NYUGDIJAZOTT NEVEK: NINCS DEFINICIO, NINCS HIVOHELY, ES AZ ERTEK MEGVAN.
   *
   * A `-sotet` vegu nevsema (`--terv-kiemel-sotet`, `--terv-keret-sotet`,
   * `--terv-szoveg-halvany-sotet`) megszunt: a sotet vilag ertekét nem kulon
   * NEV hordozza, hanem a `[data-vilag="sotet"]` blokk irja felul UGYANAZT a
   * nevet.
   *
   * A HARMADIK ALLITAS A LENYEG, es enelkul a masik ketto veszelyes lenne: azt
   * bizonyitja, hogy az ertek nem VESZETT EL, csak atkerult. Egy torles-allitas
   * onmagaban akkor is zold, ha valaki a definicioval EGYUTT az erteket is
   * kidobta -- pontosan az a nema kar, amit ma este vegig gyujtottunk.
   *
   * A DEFINICIO-KERESES `:`-ra kot, nem a puszta nevre: a nev TORTENETI
   * idezetkent ott all a `globals.css` nyugdijazo kommentjeben, es ott a helye.
   * Egy puszta nev-kereses azt is talalatnak venne, es a mercenk ketto: nulla
   * ELO elofordulas, de a visszavono idezet MARADHAT.
   */
  it("a nyugdíjazott -sotet nevek eltűntek, az értékük nem", () => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')
    const sotetBlokk = normal(CSS.slice(sotetKezd))

    for (const nev of ["--terv-keret-sotet", "--terv-szoveg-halvany-sotet"]) {
      expect(normal(CSS)).not.toContain(`${nev}:`)
      expect(CSS).not.toContain(`var(${nev})`)
    }

    expect(sotetBlokk).toContain("--terv-keret: oklch(0.28 0.014 250)")
    expect(sotetBlokk).toContain("--terv-szoveg-halvany: oklch(0.72 0.012 250)")
  })

  /**
   * A HARMADIK NYUGDIJAZAS MAS FAJTA, ES EZERT MAS PAR JAR MELLE.
   *
   * A `--terv-jelzo` az 1a lap melytenger-kek akcentje volt. Merve a tervlapok
   * teljes elem-kiolvasasan: 17 elem, MIND az 1a lapon; a rez 18 eleme MIND az
   * 1b-n. Mi az 1b akcentjet vettuk at, tehat ez a szin egyaltalan nem all a
   * lapunkon. acrobot dontese (msg 15273): nyugdijazzuk, mert KET akcent egy
   * lapon rosszabb, mint egy kovetkezetes.
   *
   * === MIERT NEM UGYANAZ AZ ALLITAS, MINT A FENTI KETTONEL ===
   *
   * Ott a harmadik allitas azt bizonyitja, hogy az ERTEK nem veszett el, csak
   * mas neven all. Itt ilyen par NINCS: az ertek szandekosan sehol nem all.
   *
   * Ezert a torles-allitas melle ISMERT POZITIV KONTROLL jar: ugyanaz a
   * kereses talalja meg az ELO akcentet. Enelkul ez az allitas egy URES
   * stiluslapon is zold lenne -- pontosan az a hiba, amit a hianyt mero
   * allitasoknal mar egyszer megfogtunk.
   *
   * A DEFINICIO-KERESES itt is `:`-ra kot: a nev TORTENETI idezetkent ott all a
   * `globals.css` nyugdijazo kommentjeben, ertekestul, hogy egy kesobbi dontes
   * ne meressel induljon ujra. A merce ketto: nulla ELO elofordulas, de a
   * visszavono idezet MARADHAT.
   *
   * === ES AMI ITT SZANDEKOSAN NINCS: A HIVOHELY-ALLITAS ===
   *
   * Elsore ide irtam egy masodik sort is, ami a `var(...)` alakra allitott
   * hianyt. AZ NEM MENT AT, es nem veletlenul: a
   * `terv-token-hasznalat.spec.ts` MINDEN forrasfajlban keresi a `var(--terv-*)`
   * hivatkozasokat, es az EN hianyt allito sztringem is hivohelynek szamit.
   * Egy allitas, ami azt mondja, hogy valami nincs hasznalva, szoveg szerint
   * ugyanugy nez ki, mint a hasznalat.
   *
   * Nem trukkoztem ki (osszefuzott sztringgel), mert a sor amugy is REDUNDANS
   * volt: az a masik spec ERŐSEBBET mer. Ha valaki visszateszi a `var(...)`
   * hivatkozast definicio NELKUL, ott pirosodik; ha definicioval EGYUTT teszi
   * vissza, itt pirosodik a fenti sor. A ketto egyutt zar, es egyik sem az en
   * masodik sorom volt.
   */
  it("a nem választott akcent eltűnt, és az élő akcent a helyén van", () => {
    expect(normal(CSS)).not.toContain("--terv-jelzo:")

    // ISMERT POZITIV KONTROLL: ugyanez a kereses megtalalja az ELO akcentet.
    expect(normal(CSS)).toContain("--terv-kiemel:")
  })

  /**
   * MINDEN VILAG-FUGGO TOKENNEK KELL NEVESITETT PAR -- ES A HELYCSERE A KOCKAZAT.
   *
   * MIERT MOST (murena merese, 2026-09-08): a bongeszos merohely (`lap-szin.sh
   * --allit`) a KITELEPITETT lapon ZOLDET adott, mikozben a rez ket erteke a
   * ROSSZ vilagban allt. Az allitasa azt kovetelte, hogy a ket ertek TERJEN EL
   * -- egy helycsere pedig eltér. Ugyanez a vaksag allt itt is, ket tokenen:
   *
   *   --terv-hatter-lap     EGYIK vilagban sem volt nevesitve -> a csere NULLA
   *                         pirosat adott volna
   *   --terv-keret-meleg    csak a VILAGOS oldalon (a PAROK tablaban); a sotet
   *                         erteket semmi nem allitotta
   *
   * A `--terv-hatter-lap` a kartyak lapja: egy csere utan a vilagos lapon
   * majdnem fekete, a soteten majdnem feher kartyak allnanak. Latszo hiba,
   * amit semmi nem fogott volna meg.
   */
  const VILAGONKENT: ReadonlyArray<readonly [string, string, string]> = [
    ["--terv-hatter-lap", "oklch(0.995 0.003 80)", "oklch(0.17 0.016 250)"],
    ["--terv-keret-meleg", "oklch(0.88 0.008 70)", "oklch(0.33 0.016 250)"],
  ]

  it.each(VILAGONKENT)("%s a helyes világban áll", (nev, vilagos, sotet) => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')

    expect(normal(CSS.slice(0, sotetKezd))).toContain(`${nev}: ${vilagos}`)
    expect(normal(CSS.slice(sotetKezd))).toContain(`${nev}: ${sotet}`)
    expect(vilagos).not.toBe(sotet)
  })

  /**
   * ES A TELJESSEG, KULONBEN A KOVETKEZO UJ TOKEN UGYANIGY KIMARAD.
   *
   * A fenti ket sort egy MERES hozta elo, nem egy szabaly. Ez az allitas a
   * szabaly: ha egy token a ket blokkban KULONBOZO erteket kap, akkor
   * valahol ebben a fajlban szerepelnie kell MIND A KET ertekevel.
   *
   * Igy egy uj vilag-fuggo token felvetele pirosra valt, es a felvevo dont --
   * nem az tortenik, hogy csendben orizetlen marad.
   */
  it("minden világonként eltérő token neve ÉS mindkét értéke szerepel itt", () => {
    const sotetKezd = CSS.indexOf('[data-vilag="sotet"]')
    const ertekek = (blokk: string) => {
      const ki: Record<string, string> = {}
      const minta = /^\s*(--terv-[a-z0-9-]+)\s*:\s*([^;]+);/gm
      let m: RegExpExecArray | null = minta.exec(blokk)
      while (m !== null) {
        ki[m[1]] = m[2].split("/*")[0].trim()
        m = minta.exec(blokk)
      }
      return ki
    }
    const v = ertekek(CSS.slice(0, sotetKezd))
    const s = ertekek(CSS.slice(sotetKezd))

    const elteroek = Object.keys(v).filter((k) => k in s && v[k] !== s[k])

    /**
     * ISMERT POZITIV KONTROLL -- ES A SZAMMAL EGYUTT, NEM CSAK "TOBB MINT NULLA".
     *
     * === MIERT NEM ELEG A `toBeGreaterThan(0)` (nautilus leletе, 2026-09-08) ===
     *
     * A regi alak azt bizonyitotta, hogy a feldolgozas talal VALAMIT. Azt nem,
     * hogy MENNYIT. Ha a fenti regex valaha elromlik -- mas behuzas, egy `/*` a
     * sor elejen, a `:root` blokk atrendezese -- es tiz helyett kettot talal, a
     * kontroll ATMEGY, es a maradek nyolc token CSENDBEN orizetlen marad.
     *
     * Ugyanaz az alak, mint amit ugyanebben az allitasban mar egyszer
     * megfogtunk: a kontroll a MECHANIZMUST bizonyitja, nem a HATOKORT.
     *
     * === MIERT PONTOS SZAM, ES NEM `>=` ===
     *
     * A `>=` alak a regex-romlast megfogja, a TORLEST nem: ha egy token kikerul
     * a stiluslapbol, a tabla-sora ittmarad, es semmi nem szol. A pontos szam
     * mind a kettot megfogja.
     *
     * === ES AMIT TENNI KELL, HA EZ A SZAM JOGOSAN VALTOZIK ===
     *
     * Ha egy TIZENEGYEDIK vilag-fuggo token kerul be, ez az allitas pirosra
     * valt. AZ NEM HIBA, hanem a szandek: a szam atirasa elott gondold vegig,
     * hogy az uj tokennek van-e NEVESITETT PARJA a `PAROK` vagy a `VILAGONKENT`
     * tablaban. A szam atirasa magaban a guard kiuresitese.
     *
     * (A ket tabla unioja ma PONTOSAN ez a tiz token, egyik iranyban sincs
     * tobblet. A szamot megis nem szarmaztatom beloluk: a `PAROK` szerzodese
     * "a kilenc ertek SZEREPENKENT", nem a vilag-fuggoseg -- ma egybeesik, de
     * nem ugyanaz az allitas, es egy jovobeli vilagos-only sor ott hamis
     * pirosat adna itt.)
     */
    expect(elteroek).toHaveLength(10)

    /**
     * A TOKEN NEVE TABLA-SORBAN ALLJON, NE CSAK A FAJLBAN VALAHOL.
     *
     * AZ ELSO VALTOZAT `SAJAT_FORRAS.includes(ertek)`-et nezett, es azt EGY
     * KOMMENT IS KIELEGITETTE. Sajat merese, 2026-09-08: felvettem egy uj
     * vilag-fuggo tokent, az ertekeit CSAK egy kommentbe irtam, es az allitas
     * ZOLD MARADT. Egy orzo, amit prozaval ki lehet elegiteni, nem orzo.
     *
     * A `["--terv-x"` alak az, ami ALLITAST hordoz: a PAROK es a VILAGONKENT
     * tabla sorai. Ma mind a tiz vilagonkent eltero token igy all.
     */
    const hianyzo = elteroek.filter(
      (k) =>
        !SAJAT_FORRAS.includes(`["${k}"`) ||
        !SAJAT_FORRAS.includes(v[k]) ||
        !SAJAT_FORRAS.includes(s[k]),
    )
    expect(hianyzo).toEqual([])
  })

  it("a sötét világnak saját érték-készlete van", () => {
    expect(CSS).toContain('[data-vilag="sotet"]')

    const sotetBlokk = CSS.slice(CSS.indexOf('[data-vilag="sotet"]'))
    /*
      MERVE A TERV NYERS FORRASABOL (2026-09-08): a sotet tervlap sajat kerete
      `background:oklch(0.17 0.016 250)` erteket visel. A korabban itt allo
      0.235 a csikos kep-helykitoltok szine volt, nem lap-hatter.
    */
    expect(normal(sotetBlokk)).toContain("--terv-hatter: oklch(0.17 0.016 250)")
    expect(normal(sotetBlokk)).toContain("--terv-szoveg: oklch(0.95 0.006 250)")
    expect(normal(sotetBlokk)).toContain("--terv-keret: oklch(0.28 0.014 250)")
  })

  /**
   * A LAP ES A PANEL ERTEKE KULONBOZIK -- ES EZT SEHOL MASHOL NEM LEHET MERNI.
   *
   * A komponensek szintjen az all, hogy a ket felulet mas TOKENT visel (a
   * `lap-vaz.component.spec` es a `ragados-sav.component.spec` allitja). Az a
   * ket allitas viszont ZOLD MARADNA akkor is, ha valaki a stiluslapon a ket
   * tokennek UGYANAZT az erteket adna: a nevek kulonboznenek, a lap egyszinu
   * lenne, es semmi nem szolna.
   *
   * A jsdom nem oldja fel a CSS-valtozokat, tehat ezt csak itt, a stiluslap
   * szovegen lehet allitani.
   */
  it("a sötét lapon a lap és a panel értéke különbözik", () => {
    const sotetBlokk = normal(CSS.slice(CSS.indexOf('[data-vilag="sotet"]')))

    const ertek = (nev: string) =>
      sotetBlokk.match(new RegExp(`${nev}: (oklch\\([^)]*\\))`))?.[1]

    const lap = ertek("--terv-hatter")
    const panel = ertek("--terv-hatter-halvany")

    /* ISMERT POZITIV KONTROLL: a kiolvasas tenyleg talalt ket erteket. */
    expect(lap).toBeTruthy()
    expect(panel).toBeTruthy()

    expect(lap).not.toBe(panel)
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
/**
 * A PUSZTA ERTEK-ALLITAS NEM ITT ALL: a "réz TINTA mind a két világban
 * definiált, saját értékkel" (a #145-bol) mar blokkonkent ellenorzi mind a ket
 * erteket. Ide csak az kerult, amit AZ NEM mond meg: hogy a sotet lapon a
 * felulet es a tinta KULONBOZIK, es hogy a vilagoson SZANDEKOSAN egybeesik.
 */
describe("a réz két szerepe", () => {
  const sotetKezd = () => CSS.indexOf('[data-vilag="sotet"]')

  const ertek = (blokk: string, nev: string) =>
    new RegExp(`${nev}:\\s*(oklch\\([^)]+\\))`).exec(blokk)?.[1]

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
