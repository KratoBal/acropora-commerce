import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ELO_ALLAT_VAZON, galeriatAdunkAt, hasznaljaVazat } from "./index"

const termek = (gyoker: string) =>
  ({ categories: [{ name: gyoker, mpath: "c1" }] }) as never

/**
 * A KAPU ALLITASAI. Amit itt mérünk, az nem a kinézet, hanem egy HATAR: hogy a
 * váz bekötése NE írja át murena élő állat lapját, amíg ő nem szól.
 */
describe("ki kapja már a vázat", () => {
  it("a műszaki termék IGEN", () => {
    expect(hasznaljaVazat(termek("Termékek"))).toBe(true)
  })

  /**
   * A KAPU KINYITVA, 2026-09-07. Az elo allat lapja MOSTANTOL a vazat kapja,
   * mind a harom gyokeren.
   *
   * EZ AZ ALLITAS KORABBAN AZ ELLENKEZOJET MONDTA, es pontosan ezert volt jo:
   * a kapcsolo atbillentese NEM tortenhetett meg eszrevetlenul -- ezt a sort
   * at kellett irni hozza, tehat a dontes a diffben all.
   *
   * AMI A NYITAS FELTETELE VOLT, es mind a ketto megvan:
   *   #91  a galeria atadasa, kulonben a jelveny es az igeret elveszne
   *   ez a PR  a sotet vilag sajat feliratai, kulonben "Hasonlo lampak" allna
   *            egy korall lapon, tartalommal a doboz alatt
   */
  it("az élő állat IGEN, mind a három gyökéren", () => {
    expect(hasznaljaVazat(termek("Korallok"))).toBe(true)
    expect(hasznaljaVazat(termek("Halak"))).toBe(true)
    expect(hasznaljaVazat(termek("Gerinctelenek"))).toBe(true)
  })

  /**
   * A KAPCSOLO MAI ERTEKE, KIMONDVA -- ES EZ NEM FOLOSLEGES ALLITAS.
   *
   * Az "élő állat IGEN" állítás akkor is zöld maradna, ha valaki a kapcsolót
   * visszaírja ÉS közben a váltót is elrontja. Ez a sor a kapcsolót MAGÁT
   * rögzíti, tehát a visszakapcsolás sem történhet meg észrevétlenül.
   */
  it("a költözés-kapcsoló BE van kapcsolva", () => {
    expect(ELO_ALLAT_VAZON).toBe(true)
  })

  /**
   * ES AMIT EZ AZ ALLITAS MOSTANTOL NEM TUD MEGMUTATNI -- KIMONDOM.
   *
   * Korabban itt az allt, hogy a muszaki termek a KIKAPCSOLT kapcsolo mellett
   * IS a vazat kapja: ez bizonyitotta, hogy a ket ag fuggetlen egymastol.
   *
   * A kapcsolo bekapcsolasa utan ez a bizonyitek MEGSZUNT, mert most mind a
   * ketto igazat ad, es a fuggveny a modul-szintu konstansbol olvas -- nem
   * tudom "kikapcsolt" allapotra kerdezni anelkul, hogy atirnam a modult.
   *
   * NEM irok helyette olyan allitast, ami ugy nez ki, mintha meg mindig merne.
   * Ami marad, az a tenymegallapitas; a fuggetlenseg a kod alakjabol latszik
   * (`vilagaTermeknek(...) === "vilagos"` KULON ag), nem ebbol a sorbol.
   */
  it("a műszaki termék továbbra is a vázat kapja", () => {
    expect(hasznaljaVazat(termek("Termékek"))).toBe(true)
  })

  /**
   * KATEGÓRIA NÉLKÜL A VÁZAT KAPJA. Ez következik abból, hogy a váltó ilyenkor
   * világosat ad -- és a biztonságos irány: a katalógus túlnyomó része műszaki.
   */
  it("kategória nélküli termék a vázat kapja", () => {
    expect(hasznaljaVazat({ categories: [] } as never)).toBe(true)
    expect(hasznaljaVazat(null)).toBe(true)
  })

  /**
   * MIT JELENT A KAPCSOLO MAI ERTEKE -- A KOVETKEZMENY, NEM A KAPCSOLO.
   *
   * A fenti sorok azt mondjak, hogy a `hasznaljaVazat` MINDEN bemenetre igazat
   * ad. Amit ebbol KOVETKEZIK, es ami eddig csak a fejunkben allt: a sablon
   * REGI aga nem fut, tehat a `ProductActions`, a `MobileActions` es a
   * `ProductActionsWrapper` ma egyaltalan nem renderelodik.
   *
   * A FORRAST OLVASSA, es megmondom, miert: a `ProductTemplate` aszinkron
   * szerver-komponens, es EGYETLEN spec sem rendereli. Amit meg lehet merni,
   * az az, hogy a ket komponens a HOLT ag `return`-je UTAN all -- vagyis az
   * elo agon nincs is ott.
   *
   * A `MobileActions` szandekosan nincs a listaban: az nem ebben a fajlban
   * all, hanem a `ProductActions` renderel belul (product-actions/index.tsx).
   * Ha az elsot nem eri el a vezerles, a masodikat sem -- egy allitas, ami
   * itt keresne, NULLA talalattal lenne zold, rossz okbol.
   *
   * ES AMIT EZ NEM BIZONYIT: nem azt, hogy a holt ag HELYES lenne, ha
   * felebredne. Arra ma semmi nincs -- ez all a sablon fejleceben is, a
   * torles harom feltetelevel egyutt.
   */
  it("a régi ág két belépési pontja a holt ág után áll", () => {
    const forras = readFileSync(join(__dirname, "..", "index.tsx"), "utf-8")

    const holtAgKezdete = forras.indexOf("MIKOR TOROLHETO EZ AZ AG")
    expect(holtAgKezdete).toBeGreaterThan(-1)

    for (const belepes of ["<ProductActions", "<ProductActionsWrapper"]) {
      const hol = forras.indexOf(belepes)
      expect(hol).toBeGreaterThan(holtAgKezdete)
    }
  })
})

/**
 * A HASONLO LISTA HELYE, ES AMIT AZ ELNYOMASNAK NEM SZABAD ELNYOMNIA.
 *
 * A `fejlecNelkul` kapcsolo egy KIMENETET nyom el (a starter angol fejlecet).
 * Egy ilyen orzo KET allitast igenyel, es a masodik nem adodik magatol, mert a
 * valtoztatas ELOTT is igaz volt: hogy a rossz esetben ne latszodjon, ES hogy a
 * jo esetben MEGIS latszodjon.
 *
 * A masodik fele az ELO ALLAT lapja: ott a lista tovabbra is a sajat fejlecevel
 * all, mert nincs korulotte cimzett doboz. Ha valaki a kapcsolot "egyszerubb
 * lesz mindenhol" alapon kiterjeszti, ez pirosra valt.
 *
 * MIERT A FORRAST OLVASSA: a `RelatedProducts` aszinkron szerver-komponens,
 * ami adatot hiv le -- jsdomban nem renderelheto. A ket ag KULONBSEGE viszont
 * a sablon forrasaban all, es az olvashato. A halo hatara ezzel kimondva: azt
 * meri, MIT AD AT a sablon, nem azt, mi jelenik meg a kepernyon.
 */
/**
 * A SZAMOLAS A KODOT NEZI, NEM A KOMMENTEKET -- ES EZT EGY VALODI ESET HIVTA ELO.
 *
 * Ezek az allitasok a forras SZOVEGEBEN szamoltak `<RelatedProducts`
 * elofordulast. Amikor a sablonba komment kerult, ami IDEZI ezt a mintat (a
 * holt ag dokumentaciojaba, epp arrol, hogy mit nem mer ott semmi), a szam
 * kettorol haromra ment, es a ket allitas pirosra valt -- holott a KOD nem
 * valtozott.
 *
 * A hiba nem a kommenté: egy kereses, ami a kommenteket is szamolja, a MULTAT
 * meri a jelen helyett (acrobot megfogalmazasa, msg_id 14823). Ezert a szamolas
 * elott a komment-blokkok es a sorvegi kommentek kikerulnek.
 *
 * A HATARA VALTOZATLAN: ez tovabbra is FORRAST olvas, nem megrenderelt lapot.
 * Azt meri, MIT AD AT a sablon, nem azt, mi jelenik meg.
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("a hasonló lista fejléce ágnként", () => {
  const forras = kodSzoveg(
    readFileSync(join(__dirname, "..", "index.tsx"), "utf-8"),
  )

  /** ISMERT POZITIV KONTROLL: a fájlt tényleg beolvastuk, és tényleg ez az. */
  it("a sablon forrása olvasható, és mindkét ág renderel hasonló listát", () => {
    expect(forras).toContain("MuszakiLap")
    expect(forras.match(/<RelatedProducts/g)).toHaveLength(2)
  })

  it("a váz ága fejléc nélkül kéri, az élő állat ága a fejléccel", () => {
    const hivasok = forras.split("<RelatedProducts").slice(1)

    expect(hivasok).toHaveLength(2)
    expect(
      hivasok.filter((h) => h.slice(0, 200).includes("fejlecNelkul")),
    ).toHaveLength(1)
  })
})

/**
 * A FOTO SLOT ATADASA -- A SZAKADAS, AMI MAR MEGVOLT, CSAK MEG NEM SULT EL.
 *
 * A #89 megepitette a slotot es megindokolta; a sablon viszont egyik agban sem
 * adta at. A kepesseg megvolt, a hivas nem -- es pontosan akkor derult volna
 * ki, amikor az elo allat lapja atall a vazra, vagyis amikor a jelveny
 * elvesztese a legdragabb.
 */
describe("ki kapja a valódi galériát a fotó slotba", () => {
  it("az élő állat IGEN, mind a három gyökéren", () => {
    expect(galeriatAdunkAt(termek("Korallok"))).toBe(true)
    expect(galeriatAdunkAt(termek("Halak"))).toBe(true)
    expect(galeriatAdunkAt(termek("Gerinctelenek"))).toBe(true)
  })

  /**
   * ES A MUSZAKI NEM -- ez a HATAR, nem elmaradas. Az o lapjan a vaz sajat,
   * tervbol keszult egykepes valtozata all, es azt nem en irom at.
   */
  it("a műszaki termék NEM: az a váz saját fotóját tartja meg", () => {
    expect(galeriatAdunkAt(termek("Termékek"))).toBe(false)
    expect(galeriatAdunkAt({ categories: [] } as never)).toBe(false)
    expect(galeriatAdunkAt(null)).toBe(false)
  })

  /**
   * ES A KET KERDES KULON ALL. Ma MINDKETTO a harom gyokerbol dol el, tehat
   * egybeesnek -- de nem ugyanaz a kerdes: az egyik azt mondja meg, KI KAPJA a
   * vazat, a masik azt, MI KERUL a foto dobozaba. Ha valaki osszevonna oket,
   * ez a sor mutatja meg, hogy a ket valasz ELLENTETES ugyanarra a termekre.
   */
  it("a két kérdés nem ugyanaz: ugyanarra a termékre ellentétes a válasz", () => {
    expect(hasznaljaVazat(termek("Termékek"))).toBe(true)
    expect(galeriatAdunkAt(termek("Termékek"))).toBe(false)
  })

  /**
   * EGYETLEN VILAG-FELOLDAS SEM HAGYHATJA EL A KATALOGUST.
   *
   * A `vilagaTermeknek` masodik argumentuma a teljes kategoria-lista. Nelkule a
   * fuggveny a termek SAJAT kategoriaira szorul, es egy LEVELES alaknal (amikor
   * a Medusa nem kuldi vissza az os-lancot) VILAGOSNAK mondja az elo allatot.
   *
   * A KAR NEM EGY DOBOZ: mind a HAROM fogyasztoja ebbol az egy fuggvenybol
   * dolgozik (a kapu, a galeria-atadas es a `vilag=` prop), tehat egy hianyos
   * lista egyszerre viszi el a sotet elrendezest, a JELVENYT es az IGERETET.
   * (acrobot merese, msg 15007: "egyetlen hianyos lista mind a harmat elviszi".)
   *
   * MIERT AZ ARANY, ES NEM A DARABSZAM: egy "pontosan harom hivas" allitas egy
   * legitim NEGYEDIK fogyasztonal is pirosra valtana, es aki ilyet lat, atirja
   * a szamot ahelyett, hogy gondolkodna. Az INVARIANS az, hogy EGYIK hivas sem
   * hagyja el a katalogust -- egy uj fogyaszto akkor is atmegy, ha helyes.
   *
   * ES AMIERT NEM A SABLONBAN MEREM: ott KET helyen all
   * `galeriatAdunkAt(product, categories)`, es a meglevo `toContain` allitas az
   * ELSOT talalja meg -- a masodikbol kieso katalogus mellett is zold maradna.
   * A valodi elagazas itt van, egy fajlban, harom soron.
   */
  it("egyetlen világ-feloldás sem hagyja el a katalógust", () => {
    const forras = readFileSync(join(__dirname, "index.tsx"), "utf-8")
    const hivasok = forras.match(/vilagaTermeknek\([^)]*\)/g) ?? []

    /** ISMERT POZITIV KONTROLL: tenyleg talalunk hivasokat, nem ures a halmaz. */
    expect(hivasok.length).toBeGreaterThan(0)

    expect(hivasok.filter((h) => h.includes(","))).toHaveLength(hivasok.length)
  })
})

/**
 * ES HOGY A SABLON TENYLEG ATADJA. Ugyanaz a hatar, mint a hasonlo listanal: a
 * sablon nem renderelheto jsdomban, a forrasa viszont olvashato. Amit ez mer:
 * MIT AD AT a sablon, nem azt, mi jelenik meg a kepernyon.
 */
describe("a sablon átadja-e a fotó slotot", () => {
  const forras = kodSzoveg(
    readFileSync(join(__dirname, "..", "index.tsx"), "utf-8"),
  )

  /**
   * ISMERT POZITIV KONTROLL: a fajl tenyleg ez, es tenyleg all benne galeria.
   *
   * A SZAM HAROM, ES A HARMADIK NEM UJ KEPESSEG. A vaz alatt a vasarlasi
   * allapot `Suspense`-be kerult, es a TARTALEK ugyanaz a vaz -- tehat a
   * galeria a vazas agon KETSZER szerepel a forrasban (tartalek es valodi),
   * plusz egyszer a regi agon:
   *
   *   1. a vazas ag Suspense-tartaleka
   *   2. a vazas ag valodi rendereleese
   *   3. a regi (vaz nelkuli) ag
   *
   * A szam beegetve marad, mert ALLITASBAN a beegetett szam maga a vedelem: ha
   * valaki egy negyedik helyre teszi -- vagy egyet elvesz --, ez pirosra valt,
   * es valaki megnezi, miert.
   */
  /**
   * A RAGADOS SAV GOMBJA UGYANAZT A TOKENT VISELI, MINT A KOSAR-GOMB.
   *
   * A sav gombja a SABLONBAN all (node-kent adjuk at), nem a komponensben,
   * tehat a `stock-state` allitasa nem fedi. Merve a tervlapon, szakaszonkent:
   * a sav gombja is a fo cselekves szinet viseli (sotet lapon 0.62, vilagoson
   * 0.55) -- vagyis a `--terv-kiemel`.
   *
   * ITT KORABBAN EGY TILTO ALLITAS IS ALLT, ES SZANDEKOSAN VETTEM KI.
   *
   * Az a sor azt tiltotta, hogy a gomb a ROVIDEBB `--terv-kiemel` nevet
   * viselje, mert akkor ket rez-valtozo letezett, es a rovidebb MINDKET
   * vilagban tevedett volna, csak ellentetes iranyba.
   *
   * A ket valtozo 2026-09-08-tol EGY (a "lenyomott allapot" parjara sehol nem
   * volt meresunk), tehat a rovid nev mostantol a HELYES -- a tiltas nem
   * elavult, hanem az ELLENKEZOJET mondana. A kockazatot nem en szuntettem
   * meg, hanem az osszevonas: nincs mibol rosszat valasztani.
   *
   * Ami MARAD belole, az a pozitiv fele: hogy a gomb tenyleg a token erteket
   * keri, es nem beirt szint. Az meg tud bukni, tehat allitas.
   */
  it("a ragadós sáv gombja a fő cselekvés tokenjét viseli", () => {
    expect(forras).toContain("ragados-sav-ugras")
    expect(forras).toContain('background: "var(--terv-kiemel)"')

    /**
     * ES A SZOVEG SZINE IS, MERT A GOMB KET ERTEKEN AL, NEM EGYEN.
     *
     * A hatter allitasa nelkul a szoveg-szin csendben elmozdulhatna: ez a
     * node a SABLONBAN all, tehat egyetlen komponens-szintu allitas sem
     * latja. Egy felmeres (2026-09-08) 54 token-hasznalatot talalt tizenket
     * fajlban, es EZ AZ EGY ertek volt olyan, amit sem forras-olvaso, sem
     * komponens-allitas nem fedett.
     */
    expect(forras).toContain('color: "var(--terv-kiemel-szoveg)"')
  })

  it("a forrás olvasható, és mindhárom helyen áll galéria", () => {
    expect(forras).toContain("MuszakiLap")
    expect(forras.match(/<ImageGallery/g)).toHaveLength(3)
  })

  it("a váz ága a fotó slotban adja át, a döntést a határ mondja meg", () => {
    const vazAg = forras.slice(
      forras.indexOf("<MuszakiLap"),
      forras.indexOf("</MuszakiLap>") > -1
        ? forras.indexOf("</MuszakiLap>")
        : forras.indexOf("  return (", forras.indexOf("<MuszakiLap")),
    )

    expect(vazAg).toContain("fotoResz={")

    /**
     * A HIVAS ALAKJA A KATALOGUST IS TARTALMAZZA, ES EZ NEM KOZOMBOS RESZLET.
     *
     * A `galeriatAdunkAt` masodik argumentuma a teljes kategoria-lista. Nelkule
     * a fuggveny a termek sajat kategoriaira szorul, es egy LEVELES alaknal
     * (amikor a Medusa nem kuldi vissza az os-lancot) vilagosnak mondja az elo
     * allatot -- vagyis a galeria, a jelveny es az igeret elmaradna.
     *
     * A puszta `galeriatAdunkAt(product)` alakra allitani tehat kevesebb lenne,
     * mint amit vedeni akarunk: az akkor is zold, ha valaki a katalogust
     * kiveszi.
     */
    expect(vazAg).toContain("galeriatAdunkAt(product, categories)")
    expect(vazAg).toContain("uniquePiece={uniquePieceOf(product.metadata)}")
  })
})

/**
 * A RAGADOS SAV GOMBJA KOVETI-E A FO CSELEKVEST (415f455c, 2026-09-08).
 *
 * === A HATARA, KIMONDVA ===
 *
 * Ez FORRAST olvas, nem megrenderelt lapot, ugyanabbol az okbol, mint a fenti
 * ket szakasz: a `ProductTemplate` aszinkron kiszolgalo-komponens. Amit tehat
 * bizonyit: a sav cselekvese a szamitott ALLAPOTTOL fugg, es nincs benne
 * feltetel nelkuli kosar-felirat. Amit NEM bizonyit: hogy a bongeszoben melyik
 * ag rajzolodik ki.
 *
 * A DONTES MAGA valodi viselkedeskent van merve, az `availability.spec.ts`-ben
 * (harom allapot, ismert pozitiv kontrollal). A ketto egyutt fedi le a lancot:
 * ott a szamitas, itt a bekotes.
 */
describe("a ragadós sáv cselekvése követi-e az állapotot", () => {
  const forras = kodSzoveg(
    readFileSync(join(__dirname, "..", "index.tsx"), "utf-8"),
  )

  /** ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es all benne sav. */
  it("a sablon forrása olvasható, és renderel ragadós sávot", () => {
    expect(forras).toContain("<RagadosSav")
    expect(forras).toContain("ragadosSavAllapota")
  })

  /**
   * A HAROM AG MINDEGYIKE MEGVAN. Ha egy kesobbi egyszerusites kiveszi
   * valamelyiket, a sav megint mondhat mast, mint a fo oszlop.
   */
  it("mindhárom állapotnak van saját cselekvése", () => {
    for (const azonosito of [
      "ragados-sav-ugras",
      "ragados-sav-hasonlo",
      "ragados-sav-elfogyott",
    ]) {
      expect(forras).toContain(azonosito)
    }
  })

  /**
   * A LENYEG: az UGRO ag a KAPHATO allapothoz van kotve.
   *
   * Nem eleg, hogy a harom azonosito ott all: az elozo allitas akkor is zold
   * lenne, ha a harom ag KOZOTT nem allna feltetel. Ezert a felteteles alakra
   * is allitunk, a valtozo NEVEVEL egyutt.
   */
  it("az ugró gomb csak a KAPHATÓ ághoz tartozik", () => {
    const ugras = forras.indexOf("ragados-sav-ugras")
    expect(ugras).toBeGreaterThan(0)

    const elotte = forras.slice(0, ugras)
    const feltetel = elotte.lastIndexOf('ragadosSavAllapota === "KAPHATO"')
    expect(feltetel).toBeGreaterThan(0)

    // A feltetel KOZVETLENUL az ugro ag elott all, nem valahol feljebb.
    expect(ugras - feltetel).toBeLessThan(400)
  })

  /**
   * ES A HIANY-ALLITAS, AMI A MAI HIBAT FOGTA VOLNA MEG.
   *
   * A regi alakban a felirat BE VOLT EGETVE a JSX-be. Mostantol a
   * `availabilityLabel.KAPHATO` konstansbol jon, tehat a szo szerinti alak
   * eltunt a sablonbol.
   *
   * EGY HIANY-ALLITAS ONMAGABAN GYENGE (egy ures fajl is kielegitene), ezert a
   * fenti pozitiv kontroll all mellette ugyanebben a szakaszban.
   */
  it("nincs feltétel nélküli kosár-felirat a sablonban", () => {
    expect(forras).not.toContain(">Kosárba<")
    expect(forras).toContain("availabilityLabel.KAPHATO")
  })
})

/**
 * A MORZSAMENU ATADASA -- ES AMIT KULON MERNI KELL: A REGI HELYE ELTUNT-E.
 *
 * A slot megepitese onmagaban nem mozditja el a morzsamenut. Ha a sablon
 * ATADJA a slotot, DE a regi `content-container` doboz is ottmarad, akkor a
 * lapon KET morzsamenu all: egy a vilagos savban, egy a sotet feluleten. Ez
 * nem hibazna es nem hasalna el -- csak ketszer latszana.
 *
 * Ezert ket allitas all itt, nem egy: hogy a slot MEGY, es hogy a regi hely
 * CSAK a masik agban maradt meg.
 */
describe("a morzsamenü átadása a váznak", () => {
  const forras = kodSzoveg(
    readFileSync(join(__dirname, "..", "index.tsx"), "utf-8"),
  )

  /**
   * ISMERT POZITIV KONTROLL -- ES AZ ELSO ALAKJA NEM AZ VOLT.
   *
   * Eloszor a morzsamenuk SZAMAT is ez az allitas tartalmazta, es a
   * kalibracion kiderult, hogy ettol nem kontroll: mind a harom rontas
   * elvitte, mert mind a harom epp azt a szamot mozditja. Egy kontroll, ami a
   * vizsgalt dologgal egyutt mozdul, nem mond semmit arrol, hogy a meres
   * megtortent-e.
   *
   * Igy most CSAK azt allitja, hogy a fajlt tenyleg beolvastuk, es tenyleg a
   * termeklap sablonja az. A szam kulon allitas lett alatta.
   */
  it("a forrás olvasható, és tényleg a termékoldal sablonja", () => {
    expect(forras).toContain("MuszakiLap")
    expect(forras).toContain("hasznaljaVazat")
  })

  it("három helyen áll morzsamenü: két váz-példány és az élő állat ága", () => {
    expect(forras.match(/<ProductBreadcrumb/g)).toHaveLength(3)
  })

  it("a váz mindkét példánya megkapja a morzsamenüt", () => {
    expect(forras.match(/morzsaResz=\{/g)).toHaveLength(2)
  })

  /**
   * A REGI HELY CSAK EGYSZER MARADT MEG, ES AZ A MASIK AG.
   *
   * A `kodSzoveg` kiszedi a megjegyzeseket, tehat az a bekezdes, amelyik ezt a
   * koltozest INDOKOLJA es kozben leirja a regi alakot, nem szamit bele. Ez
   * nem reszletkerdes: egy javito szoveg, ami idezi a regit, mar tobbszor
   * dontott el nalam hamisan egy hiany-allitast.
   */
  it("a régi hely csak az élő állat ágában maradt", () => {
    expect(forras.match(/className="content-container pt-6"/g)).toHaveLength(1)
  })
})
