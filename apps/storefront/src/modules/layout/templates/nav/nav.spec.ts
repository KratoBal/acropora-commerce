import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A MEGJEGYZESEKET KISZEDJUK, ES EZ ITT KULONOSEN FONTOS: a fejlec fejleceben
 * ott all a tervbeli ERTEKEK tablazata (`oklch(...)`), es ott all az is, hogy
 * korabban `Cart (0)` szoveg volt. Megjegyzes-szures nelkul mindket
 * hiany-allitas SAJAT MAGAT elegitene ki.
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const forras = (...ut: string[]) =>
  kodSzoveg(readFileSync(join(__dirname, ...ut), "utf-8"))

/**
 * A FEJLEC FO SAVJA.
 *
 * A komponens ASZINKRON szerver-komponens, ami regiot es kategoriakat hiv le --
 * jsdomban nem futtathato, tehat a forrasa merheto, nem a renderelt fa.
 *
 * AMIT EZ NEM BIZONYIT: hogy a lapon jol NEZ KI. Azt csak a kitelepitett lapon
 * lehet megnezni, es arra kulon merohely van.
 */
describe("a fejléc fő sávja", () => {
  const nav = forras("index.tsx")

  /**
   * A TAPADAS BALAZS KIMONDOTT KERESE (2026-09-09): "a fejlec menusav
   * tapadjon". A mai bolt is ezt csinalja: nullatol kilencszaz pixelig gorgetve
   * a sav feltapad a lap tetejere es vegig ott marad.
   *
   * A `sticky top-0` MAR KORABBAN IS ITT ALLT -- ez az allitas nem uj
   * viselkedest ir le, hanem MEGFOGJA, ha valaki elveszi. Epp ez tortent az
   * ellenkezo iranyban: egy rejto mechanizmus kerult a menu-komponensbe, es a
   * savot gorgetesre eltuntette. Az visszavonva, es ide orzo kerult.
   */
  it("a fejléc tapad a lap tetejéhez", () => {
    expect(nav).toMatch(/sticky\s+top-0/)
  })

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es tenyleg a fejlec az. */
  it("a forrás olvasható, és tényleg a fejléc", () => {
    expect(nav).toContain("export default async function Nav")
    expect(nav).toContain("FejlecMenu")
  })

  /**
   * A 78 PIXEL MEGVAN, CSAK MAR NEM ITT ALL SZAM SZERINT.
   *
   * Ez az allitas eddig a `h-[78px]` osztalyt kereste, es JOGGAL bukott el,
   * amikor a magassag kozos valtozoba kerult. Az ERTEK nem valtozott: a
   * `--fejlec-magassag` 79 pixel (a 78 pixeles sav plusz az 1 pixeles also
   * keret), es a sav ebbol vonja le a keretet.
   *
   * MIERT KERULT KOZOS VALTOZOBA: a termeklap jobb panelje ugyanebbol szamolja
   * a tapadasi eltolast. Ket kulon szam egyszer mar szetcsuszott -- a panel 16
   * pixelre tapadt, es a tetejebol 63 pixel a fejlec ala kerult.
   *
   * A magat az ERTEKET a `lap-vaz/panel-tapadas.spec.ts` orzi, egy helyen.
   */
  it("a fő sáv magassága a közös változóból jön", () => {
    expect(nav).toMatch(/calc\(var\(--fejlec-magassag\) - 1px\)/)
    expect(nav).not.toContain("h-[78px]")
  })

  /**
   * A FELSO SAV MEGEPULT -- ES A REGI ALLITAS NEM VETTE ESZRE.
   *
   * Itt korabban ez allt: "a felső 36 pixeles sáv NINCS megépítve", ezzel a ket
   * meressel:
   *
   *     expect(nav).not.toContain("h-[36px]")
   *     expect(nav).not.toContain("Árukereső")
   *
   * A sajat megjegyzese kimondta: "Ha valaki egyszer megepiti, ennek pirosodnia
   * KELL". MEGEPULT, ES NEM PIROSODOTT. A magassag beagyazott stilusban all
   * (`height: "36px"`), nem osztalykent, es az Arukereso-sor helyere Balazs
   * dontese szerint a Fogyasztobarat tanusitvany kerult -- vagyis a szo sem
   * szerepel. Mind a ket meres egy-egy IRASMODRA szolt, nem az allapotra.
   *
   * Ez ugyanaz a csalad, mint a tukor-allitas: a nev helyes volt, a targya nem.
   *
   * A HELYERE AZ UJ ALLAPOT ALLITASAI KERULNEK, es kozottuk kulon all a KET
   * dolog, amit Balazs kikotott: nincs kitalalt szam, es a segitseg-felirat nem
   * link, amig nincs cime.
   */
  it("a felső sáv megépült, a terv három szövegével", () => {
    expect(nav).toContain('data-testid="fejlec-bizalmi-sav"')
    expect(nav).toContain("Élő megérkezési garancia")
    expect(nav).toContain("Fogyasztóbarát tanúsítvány")
    expect(nav).toContain("Szakértői segítség")
  })

  /**
   * A KET SZAM BALAZSTOL VAN, ES A DATUMUK IS KI VAN IRVA.
   *
   * ITT KORABBAN EGY TAGADAS ALLT ("nincs értékelés-szám a sávban"), amikor meg
   * nem volt szam. Amikor Balazs megadta oket (4,8 · 213 velemenybol), a
   * tagadas NEM PIROSODOTT -- pedig szam kerult a savba.
   *
   * AZ OK UGYANAZ, AMIT EGY ORAVAL KORABBAN MASNAL TALALTAM: a tagadas a TERV
   * IRASMODJARA szolt (`4,9 / 5`, `N értékelés`), nem arra, hogy van-e szam. A
   * "4,8 · 213 értékelésből" egyik mintara sem illeszkedik. Sajat magamon
   * ismetlem meg a hibat, amit epp elotte irtam le.
   *
   * A HELYERE MEGLET-ALLITAS KERUL: a ket ERTEK es a datum. Igy ha barmelyik
   * elcsuszik, az pirosodik -- es a datum arra szolgal, hogy egy ev mulva
   * lassa valaki, hogy ezek a szamok NEM frissulnek maguktol.
   */
  it("a tanúsítvány két száma és a dátuma ki van írva", () => {
    expect(nav).toContain("4,8")
    expect(nav).toContain("213 értékelésből")
    expect(nav).toContain('BIZALMI_TANUSITVANY_DATUM = "2026-09-09"')
    expect(nav).toContain("data-tanusitvany-allapot")
  })

  /**
   * A SAV SZELETE, EGY HELYEN. Tobb allitas hasznalja, es egy elcsuszo hatar
   * mindegyiket egyszerre tenne hamissa.
   *
   * A KEZDET A NYITO `<div`, NEM A JELOLO. A `data-testid` a JSX-ben a
   * `className` UTAN all, tehat egy jeloloneél kezdodo szelet epp az
   * osztalyokat hagyna ki -- es a betumeret-allitas emiatt bukott el eloszor,
   * egy helyes fajlon. A visszalepes az utolso `<div`-ig ezt lezarja.
   */
  const bizalmiSav = () => {
    const jelolo = nav.indexOf("fejlec-bizalmi-sav")
    const nyito = nav.lastIndexOf("<div", jelolo)

    return nav.slice(nyito, nav.indexOf("</div>", jelolo))
  }

  /**
   * A BETUMERET A TERVBOL JON, FEL PIXEL PONTOSSAGGAL.
   *
   * A terv 12.5 pixelt ir, a `text-xs` 12-t ad. Kicsi kulonbseg, de a savban ez
   * az EGYETLEN szovegmeret, es a forras kiirja -- tehat nincs miert becsulni.
   *
   * A TAGADAS AZERT KELL, mert a `text-xs` visszairasa ONMAGABAN nem venne el a
   * `text-[12.5px]` jelenletet, ha valaki mind a kettot ott hagyja: akkor ket
   * meret allna egymas mellett, es a Tailwind sorrendje dontene.
   */
  it("a felső sáv a terv betűméretét viseli", () => {
    expect(bizalmiSav()).toContain("text-[12.5px]")
    expect(bizalmiSav()).not.toContain("text-xs")
  })

  /**
   * A JOBB OLDALT KOZ VALASZTJA EL, NEM KARAKTER.
   *
   * A tervforrasban a ket szoveg `gap:24px` kozzel all egymas mellett, es NINCS
   * kozottuk elvalaszto. En egy `·` pontot tettem oda kep alapjan, nyolc
   * pixeles kozzel -- mind a ketto az en betoldasom volt.
   *
   * A TAGADAS SZUK, ES SZANDEKOSAN AZ: magaban a tanusitvany szovegeben KET `·`
   * all ("Fogyasztóbarát tanúsítvány · 4,8 · 213 értékelésből"). Egy "nincs `·`
   * a savban" allitas tehat mindig piros lenne, es semmit nem mondana. Amit
   * kizarunk, az az ONALLO elvalaszto ELEM.
   */
  it("a jobb oldalt köz választja el, nem karakter", () => {
    expect(bizalmiSav()).toContain("gap-6")
    expect(bizalmiSav()).not.toContain('aria-hidden="true">·<')
  })

  /**
   * A SEGITSEG-FELIRAT FELKOVER IS, NEM CSAK REZ SZINU. A tervforras
   * `font-weight:600` erteket ad neki, es ez a savban az egyetlen kiemelt
   * szoveg -- a szin onmagaban nem adja vissza.
   */
  it("a segítség-felirat félkövér, nem csak réz színű", () => {
    const sav = bizalmiSav()
    const felirat = sav.slice(sav.indexOf("BIZALMI_SEGITSEG") - 260)

    expect(felirat).toContain("font-semibold")
    expect(felirat).toContain("var(--terv-kiemel-tinta)")
  })

  /** ES AMI NEM KERULT VISSZA: a kulso szolgaltatas, amire nincs forrasunk. */
  it("az Árukereső-sor nem jött vissza", () => {
    expect(nav).not.toContain("Árukereső")
  })

  /**
   * ES A FELIRAT NEM LINK. Egy felirat, ami nem visz sehova, elfogadhato; egy
   * link, ami rossz helyre visz, nem. Amint van cime, ez az allitas fog
   * pirosodni -- es akkor kell ujra eldonteni.
   */
  it("a segítség-felirat nem link", () => {
    const sav = nav.slice(
      nav.indexOf("fejlec-bizalmi-sav"),
      nav.indexOf("</div>", nav.indexOf("fejlec-bizalmi-sav")),
    )

    expect(sav).toContain("BIZALMI_SEGITSEG")
    expect(sav).not.toContain("href")
    expect(sav).not.toContain("LocalizedClientLink")
  })

  /**
   * A NEV OLYAN SZUK, AMILYEN A FIXTURA -- ES EZ JAVITAS (acrobot kerese,
   * 2026-09-08, msg 15332).
   *
   * Az allitas eloszor "a színek tokenből jönnek, nyers érték nélkül" nevet
   * viselte, es CSAK a `nav/index.tsx` fajlt olvasta. A nev a fejlec szineirol
   * beszelt, a merese egy fajlrol -- vagyis szukebb volt, mint a neve.
   *
   * Ez a legrosszabb fajta zold: nem hamis, csak kevesebbet mer, mint amit
   * igér, es epp azt a teruletet fedi el, amit sosem nezett. Egy piros allitas
   * megall es kerdez; egy tul tag NEVU zold megnyugtat.
   *
   * A nev mostantol a FO SAV FAJLJARA szol. Ami a fejlec tobbi fajljara igaz,
   * az kulon allitas, sajat nevvel, alabb.
   */
  it("a fő sáv fájlja tokent használ, nyers érték nélkül", () => {
    expect(nav).toContain("var(--terv-keret)")
    expect(nav).toContain("var(--terv-kiemel)")
    expect(nav).toContain("var(--terv-szoveg)")
    expect(nav.match(/oklch\(/g)).toBeNull()
  })

  /**
   * ES AMIT A TAG NEV IGERT, AZ ITT ALL, MERVE -- MIND A HAROM FAJLRA.
   *
   * A fejlec nem egy fajl: a fo sav mellett a kosar-legordulo es az oldalso
   * menu is benne all. Nyers `oklch` ertek EGYIKBEN SINCS, tehat ez az allitas
   * a tag nevet MEGERDEMLI.
   *
   * AMIT VISZONT EZ SEM MER, ES KIMONDOM: a ROGZITETT osztalyokat
   * (`text-ui-fg-base` es tarsai). Azokbol ma a kosar-legordulo egyet, az
   * oldalso menu harmat visel. Nem hiba, amig a fejlec vilagos -- de a fejlec
   * vilag-kovetese mar el van dontve, es akkor pontosan ezek nem fognak
   * atvaltani. Ugyanaz az alak, amit a #193 a termeklapon es a #210 a
   * morzsamenunel javitott.
   *
   * Allitast NEM irok ra, mert az ma pirosodna: a javitas a vilag-kor resze,
   * es oda tartozik a dontes is, hogy melyik osztaly mire cserelodik.
   */
  it("a fejléc EGYIK fájljában sincs nyers oklch érték", () => {
    const kosar = forras("..", "..", "components", "cart-dropdown", "index.tsx")
    const oldalso = forras("..", "..", "components", "side-menu", "index.tsx")

    /* ISMERT POZITIV KONTROLL: mind a harom fajlt tenyleg beolvastuk. */
    expect(nav).toContain("export default async function Nav")
    expect(kosar).toContain("CartDropdown")
    expect(oldalso.length).toBeGreaterThan(0)

    expect(nav.match(/oklch\(/g)).toBeNull()
    expect(kosar.match(/oklch\(/g)).toBeNull()
    expect(oldalso.match(/oklch\(/g)).toBeNull()
  })
})

describe("a fejléc keresője", () => {
  const nav = forras("index.tsx")

  /**
   * A MEZO NEVE `q`, ES A CIM A `/store`. A ketto EGYUTT ad mukodo keresest: a
   * `/store` lap a `q` parametert olvassa. Ha barmelyik elcsuszik, a kereso NEM
   * hibazik -- a vevo egy szuretlen listan all, es nem tudja, miert.
   */
  it("a mező neve q, és az űrlap a /store lapra küld", () => {
    expect(nav).toContain('name="q"')
    expect(nav).toContain('method="get"')
    expect(nav).toContain("/store")
  })

  /**
   * A HELYKITOLTO NEGY IGERETE, ES MIND A NEGY MERVE ALL.
   *
   * A terv 2a lapja "fajra", az 1b "markara" szot ir -- ott KET KULON fejlec
   * allt. A mienk mind a ket vilagot kiszolgalja, tehat mind a ketto kell:
   * egy elo allat lapjan az egyik a hasznos szo, egy muszaki termeken a masik.
   *
   * A MERES a komponens fejlecebe van beirva, szamokkal (ATB 111, Aquaforest
   * 79, austea 1, es a nulla-kontroll). Ha valaki atirja a szoveget, ez
   * pirosodik, es akkor ujra le kell merni, hogy az uj szo igaz-e.
   */
  it("a helykitöltő négy ígérete", () => {
    expect(nav).toContain("Keresés termékre, fajra, márkára, cikkszámra")
  })

  /**
   * ES A HATAR IS OTT ALL A KODBAN, NEM CSAK AZ IGERET.
   *
   * A negybol harom (termek, faj, marka) UGYANAZON az alapon mukodik: a szo a
   * cimben vagy a leirasban all. Egy megjegyzes, ami csak az igeretet mondja
   * ki, fel ev mulva ugyanolyan ellenorizhetetlen -- ezert allnak ott a mert
   * szamok, es ezert orzi ez az allitas, hogy ott is maradjanak.
   */
  it("a keresés határa és a mérése a kódban áll", () => {
    /*
      EZ AZ EGYETLEN ALLITAS, AMI A NYERS FORRAST OLVASSA, ES MEGMONDOM MIERT.

      A fajl tobbi allitasa a `kodSzoveg`-en mer, mert ott a megjegyzes HAMIS
      TALALATOT adna. Itt forditva all: az allitas TARGYA maga a megjegyzes --
      azt orzi, hogy a meres ott marad a kod mellett. Komment-szuressel ez az
      allitas SOHA nem tudna teljesulni, es epp ezt tapasztaltam: elso alakja a
      szurt szovegen mert, es pirosra fordult egy helyes fajlon.

      Ugyanaz a ket iranya egy dolognak: a megjegyzes VESZELY, amikor a kodrol
      allitunk valamit, es TARGY, amikor a dokumentaciorol.
    */
    const nyers = readFileSync(join(__dirname, "index.tsx"), "utf-8")

    expect(nyers).toContain("NINCS strukturalt marka-mezo")
    expect(nyers).toContain("q=zzzzqqqq")
    expect(nyers).toContain("111 talalat")
  })

  /** A mezonek cimkeje is van, kulonben csak a helykitolto azonositja. */
  it("a mezőnek van címkéje", () => {
    expect(nav).toContain('htmlFor="fejlec-kereso-mezo"')
  })
})

describe("a kosár gomb felirata", () => {
  const kosar = forras("..", "..", "components", "cart-dropdown", "index.tsx")

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es ez a kosar-legordulo. */
  it("a forrás olvasható, és tényleg a kosár", () => {
    expect(kosar).toContain("CartDropdown")
    expect(kosar).toContain('data-testid="nav-cart-link"')
  })

  /**
   * MAGYARUL, ES A TERV ALAKJABAN. Eddig `Cart (0)` allt itt -- angolul, a lap
   * legjobban lathato pontjan. A tervbeli alak kozeppontot hasznal, nem
   * zarojelet.
   */
  it("a felirat magyar, a terv alakjában", () => {
    expect(kosar).toContain("Kosár · ${totalItems}")
    expect(kosar).not.toContain("Cart (")
  })
})

/**
 * A FEJLEC GEOMETRIAJA -- ES AMIERT MOST KAPJA MEG.
 *
 * Merve (2026-09-08): a kirakatban a terv-eredetu GEOMETRIAI ertekek 15
 * szazalekara all allitas, a szin-tokenek 72 szazalekara. Ez a fajl volt a
 * legnagyobb egybefuggo hiany: tizenegy jelolobol kilencet nem tartott semmi.
 *
 * A MERT ERTEKEK, a terv 1b (vilagos) fejlecebol, egy bejarassal kiolvasva:
 *
 *     fo sav        height:78px  gap:40px  padding:0 44px
 *     logo negyzet  30 x 30
 *     szovegjel     21px / 700 / letter-spacing 0.1em
 *     kereso        height:46px  padding:0 16px  gap:12px  font-size:14px
 *     nagyito       13 x 13
 *     menu          gap:22px  font-size:14px / 500
 *     kosar gomb    height:46px  padding:0 20px  gap:10px  14px / 600
 *
 * A 44 PIXELES OLDALMARGO NEM PADDINGKENT ALL NALUNK, es ezt kimondom, hogy ne
 * latszodjon hianynak: a sav `maxWidth: 1352px` erteken kozepre igazodik, es
 * 1440-en ez pontosan 44 pixelt hagy ket oldalt. Ugyanaz az ertek, masik uton --
 * es igy kisebb szelessegen is helyesen viselkedik.
 *
 * AMIT NEM MER: hogy a lapon jol NEZ KI. Ez a fajl forras-szoveget olvas, tehat
 * a JELOLES meglétét meri. Ugyanaz a hatar, ami a fenti allitasokra is all.
 */
describe("a fejléc geometriája a tervből", () => {
  const nav = forras("index.tsx")
  const menu = forras("fejlec-menu.tsx")

  it("a logó-négyzet a tervbeli 30 pixel", () => {
    expect(nav).toContain("h-[30px]")
    expect(nav).toContain("w-[30px]")
  })

  it("a szóvédjegy mérete és betűköze a tervből", () => {
    expect(nav).toContain("text-[21px]")
    expect(nav).toContain("tracking-[0.1em]")
  })

  /**
   * A KERESO MAGASSAGA BEAGYAZOTT STILUSBAN ALL, nem osztalyban -- ezert mas
   * alakra keresunk. Nem kovetkezetlenseg: a mezo magassagat a doboz adja.
   */
  it("a kereső-mező a tervbeli 46 pixel, 12 pixeles közzel", () => {
    expect(nav).toContain('height: "46px"')
    expect(nav).toContain("gap-3")
  })

  it("a nagyító-jel a tervbeli 13 pixel", () => {
    expect(nav).toContain("h-[13px]")
    expect(nav).toContain("w-[13px]")
  })

  it("a menüpanel a teljes fejléc alatt indul", () => {
    expect(menu).toContain('PANEL_TOP = "calc(var(--fejlec-magassag) + 36px)"')
  })

  /**
   * A KOSAR-GOMB A KERESOVEL AZONOS MAGASSAGU (46), es ez a tervben is igy all
   * -- a ket elem egy vonalban zar. Kulon allitas, mert kulon is elromolhat.
   */
  it("a kosár-gomb magassága és margója a tervből", () => {
    expect(nav).toContain("h-[46px]")
    expect(nav).toContain("px-5")
  })
})
