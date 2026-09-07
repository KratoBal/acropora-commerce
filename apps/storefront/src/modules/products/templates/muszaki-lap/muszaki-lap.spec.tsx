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
describe("a hasonló lista fejléce ágnként", () => {
  const forras = readFileSync(join(__dirname, "..", "index.tsx"), "utf-8")

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
})

/**
 * ES HOGY A SABLON TENYLEG ATADJA. Ugyanaz a hatar, mint a hasonlo listanal: a
 * sablon nem renderelheto jsdomban, a forrasa viszont olvashato. Amit ez mer:
 * MIT AD AT a sablon, nem azt, mi jelenik meg a kepernyon.
 */
describe("a sablon átadja-e a fotó slotot", () => {
  const forras = readFileSync(join(__dirname, "..", "index.tsx"), "utf-8")

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
   * 0.55) -- vagyis ugyanaz a `--terv-kiemel-sotet`.
   *
   * A `--terv-kiemel` rovidebb neve MINDKET vilagban tevedne, csak ellentetes
   * iranyba, es ezt egy forras-olvaso allitas tudja megfogni: a sablon nem
   * renderelheto jsdomban, a forrasa viszont olvashato.
   */
  it("a ragadós sáv gombja a fő cselekvés tokenjét viseli", () => {
    expect(forras).toContain("ragados-sav-ugras")
    expect(forras).toContain("var(--terv-kiemel-sotet)")
    expect(forras).not.toContain('background: "var(--terv-kiemel)"')
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
    expect(vazAg).toContain("galeriatAdunkAt(product)")
    expect(vazAg).toContain("uniquePiece={uniquePieceOf(product.metadata)}")
  })
})
