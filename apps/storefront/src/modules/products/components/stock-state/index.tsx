import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  availabilityLabel,
  SIMILAR_ITEMS_LABEL,
  SOLD_OUT_EXPLANATION,
  type Availability,
} from "./availability"

/**
 * A FO CSELEKVES MERETE A PANELBEN -- A TERVBOL MERVE, EGY HELYEN.
 *
 * Konstans, hogy a szam egy helyen alljon, es hogy allitas mutathasson ra.
 * A `h-[54px]` a terv `height:54px` erteke, a `text-base` a 16px, a
 * `font-semibold` a 600 -- mind a harom UGYANABBOL az elembol, mindket
 * epulo lapon azonos.
 *
 * A SZELESSEG (`w-full`) NEM a tervbol jon: ott a gomb `flex:1` egy sorban,
 * ahol a lepteto is all. Nalunk a szulo adja a sort, tehat a gomb a sajat
 * dobozat tolti ki. Ugyanaz az eredmeny, mas uton -- es ezert all itt kulon.
 */
export const FO_GOMB_MERET = "h-[54px] w-full text-base font-semibold"

/**
 * A KÉSZLET-ÁLLAPOT MEGJELENÍTÉSE, HÁROM ÁLLAPOTTAL.
 *
 * TISZTA MEGJELENÍTÉS: a döntés az `availabilityOf`-ban áll, itt csak a
 * kirajzolás. Így a műszaki lap ugyanezt a dobozt használhatja -- ott az
 * `uniquePiece` mindig hamis, tehát két állapotot lát, nem hármat.
 */
export default function StockState({
  availability,
  similarHref,
  onAddToCart,
  isAdding = false,
  disabled = false,
  testId = "add-product-button",
}: {
  availability: Availability
  /** Hová visz az "Eladva" állapot továbbvivő gombja. */
  similarHref: string
  onAddToCart: () => void
  isAdding?: boolean
  disabled?: boolean
  /**
   * A KOSÁR-GOMB AZONOSÍTÓJA.
   *
   * === EZ A MONDAT TÚLÉLTE AZT AZ ÁLLAPOTOT, AMIRŐL SZÓLT (javítva 2026-09-08) ===
   *
   * Korábban jelen időben ez állt itt: "a lap KÉT helyen rajzolja ki ezt a
   * dobozt (a lapon és a lebegő sávon)". Ez a RÉGI ágra volt igaz, ahol a
   * `ProductActions` és a `MobileActions` párban rajzolta ki, és a két azonos
   * azonosító kétértelművé tette volna a végponti keresést. A paraméter ezért
   * született, és az indok a maga idejében helyes volt.
   *
   * A MAI ÁLLAPOT, mérve: három hívóhely létezik (`product-actions/index.tsx`,
   * `product-actions/mobile-actions.tsx`, `vasarlas/dobozok.tsx`), de a régi ág
   * MA EGYETLEN SORA SEM FUT (`hasznaljaVazat` feltétel nélkül igazat ad),
   * tehát ebből egy renderelődik. A lebegő sáv pedig azóta a SAJÁT cselekvését
   * rajzolja, az állapotot tükrözve, nem ezt a dobozt (415f455c).
   *
   * === MIÉRT NEM TÖRLÖM A PARAMÉTERT, ÉS MIÉRT NEM HAGYOM ÍGY ===
   *
   * Nem törlöm: a `MobileActions` ma is átadja, és a régi ág törlése külön
   * döntés, nem ennek a fejlécnek a dolga.
   *
   * De nem is hagyom jelen időben. Ez a mondat pontosan azért volt drága, mert
   * NEM hibázott: azt állította, hogy a sáv már kezelve van, és emiatt a sáv
   * hibája hetekig úgy nézett ki, mintha meg lenne oldva. Egy dokumentáció,
   * ami egy megszűnt bekötést ír le, nem elavult jegyzet, hanem HAMIS
   * biztonság.
   */
  testId?: string
}) {
  /*
    AZ ELADVA NEM LETILTOTT GOMB, HANEM MÁSIK GOMB.

    Egy szürke, letiltott "Kosárba" ugyanazt a zsákutcát adná, mint a mai "Out of
    stock": a vevő látja, hogy nem kaphatja meg, és nem kap semmit helyette.
  */
  if (availability === "ELADVA") {
    return (
      <div className="flex flex-col gap-2" data-testid={testId + "-eladva"}>
        {/*
          SEMLEGES SZÜRKE, SZÁNDÉKOSAN NEM PIROS (picasso terve, 2026-09-07):
          az "Eladva" ténykozlés, nem hibaüzenet. A délelőtti vörösesbe hajló
          változat helyére ez került.
        */}
        {/*
          A SZIN TOKENBOL JON, NEM BEIRT SZURKEBOL -- ES EZ MOST MAR NEM
          KOVETKEZETESSEG, HANEM OLVASHATOSAG.

          A koltozes-kapcsolo bekapcsolasa (#103) ota ez a komponens a SOTET
          vilagon is megjelenik. Ott a lap hattere `oklch(0.17 0.016 250)`, a
          beirt `text-neutral-700` pedig sotet szurke: sotet szurke majdnem
          feketen. A `--terv-szoveg` mindket vilagban helyes (vilagosban
          `oklch(0.2 ...)`, sotetben `oklch(0.95 ...)`), mert epp ezert token.

          A "semleges szurke, szandekosan nem piros" dontes VALTOZATLAN: az
          Eladva tenykozles, nem hibauzenet. Csak a szurke forrasa lett a
          token.
        */}
        {/*
          AZONOSITO MIND A KETTON, HOGY ALLITAST LEHESSEN RAJUK IRNI.

          A ket span eddig azonosito NELKUL allt, es emiatt EGYETLEN allitas sem
          mutatott rajuk: a token-fedettseg merese (2026-09-08) huszonharom
          fedetlen style-node-ot talalt, es ez ketto volt kozuluk.

          Az azonosito nem dekoracio: azonosito nelkul a spec csak a SZOVEGRE
          tud hivatkozni, es akkor egy felirat-javitas ELVISZI a szin-allitast
          is -- vagyis a ket dolog egyutt romlana el, holott kulon-kulon
          valtoznak.
        */}
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--terv-szoveg)" }}
          data-testid={testId + "-eladva-cimke"}
        >
          {availabilityLabel.ELADVA}
        </span>
        <span
          className="text-xs leading-relaxed"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid={testId + "-eladva-magyarazat"}
        >
          {SOLD_OUT_EXPLANATION}
        </span>
        <LocalizedClientLink href={similarHref}>
          <Button variant="secondary" className="h-10 w-full">
            {SIMILAR_ITEMS_LABEL}
          </Button>
        </LocalizedClientLink>
      </div>
    )
  }

  /**
   * A FO CSELEKVES REZ -- MERVE A TERVBOL, NEM A TOKEN NEVEBOL KOVETKEZTETVE.
   *
   * === HELYESBITVE 2026-09-08: AZ ELSO MERESEM A ROSSZ LAPRA SZOLT ===
   *
   * Eloszor EGYETLEN gombot mertem meg (`y=640`, 402x54), es nem neztem meg,
   * MELYIK VALTOZAT lapjan all. A tervfajl HAROM lapot tartalmaz egymas alatt
   * (`2a` sotet korall, `1a` es `1b` vilagos lampa), es az a gomb a SOTET
   * lapon volt. Szakaszonkent ujramerve, mindket szakaszban kilenc rez elem,
   * szakaszon belul NULLA kivetel:
   *
   *   2a (sotet)   hatter oklch(0.62 0.13 45)   szoveg oklch(0.15 0.014 45)
   *   1b (vilagos) hatter oklch(0.55 0.13 45)   szoveg FEHER
   *   1a           NULLA rez hatteru elem
   *
   * A VILAGOS KILENC EGYETLEN LAPON ALL, ES EZ 2026-09-08-ig "1a + 1b" alakban
   * allt itt. Az 1a lapon nincs egyetlen rez hatteru elem sem -- nem azert,
   * mert hianyzik az adatbol (156 eleme van a kiolvasasban), hanem mert azon a
   * lapon nincs rez felulet. A kovetkeztetes valtozatlan (vilagos 0.55), de a
   * halmaz neve pontatlan volt: aki az 1a lapon ellenorizne, nem talalna
   * semmit, es azt hinne, hogy a meres megdolt. (nautilus pontositasa,
   * msg_id 14799; kontrollal visszamerve.)
   *
   * A tokenjeink szerint (`globals.css`) mind a ketto UGYANAZON a valtozon
   * all: `--terv-kiemel`, aminek az ERTEKE blokkonkent mas (vilagos 0.55,
   * sotet 0.62). Ugyanezt adta murena kosar-merese is (a kosar akcent alapja
   * 0.55), harmadik fuggetlen forraskent.
   *
   * EZ A BEKEZDES 2026-09-08-IG MAST MONDOTT, es a valtozas nem az ertekekben
   * van, hanem a NEVEKBEN. Akkor ket rez-valtozo letezett, es a helyes a
   * hosszabbik (`--terv-kiemel-sotet`) volt: a rovidebb MINDKET vilagban
   * tevedett, csak ellentetes iranyba. A ket valtozo azota EGY, mert a
   * masodikra -- a "lenyomott allapotra" -- sehol nem volt meresunk: egy lapon
   * belul pontosan egy rez ertek all, nulla kivetellel.
   *
   * Vagyis a "ne a rovid nevet hasznald" figyelmeztetes MEGFORDULT: ma a rovid
   * nev az egyetlen, es a helyes.
   *
   * ES A SZOVEG-KERDES AZOTA LEZARULT (acrobot dontese, msg_id 14690): a
   * terv VILAGOS lapjain a rezen allo felirat FEHER, tehat a
   * `--terv-kiemel-szoveg` vilagos erteke `oklch(1 0 0)` lett, a soteten
   * pedig valtozatlanul `oklch(0.15 0.014 45)`. Ez nem a kilences keszlet
   * felulirasa, hanem annak a meresnek a javitasa, ami a keszletet elohozta:
   * a "mind az ot rez-hatteru elem ugyanezt hasznalja" levezetes a SOTET (2a)
   * lapon keszult, es onnan kerult at a vilagos vilagra is.
   *
   * ES AMI UGYANEBBOL A MERESBOL KIDERULT, ES EPP ILYEN FONTOS: a "Köteg
   * kosárba" gomb NEM rez (`oklch(0.95 0.006 250)`), es az ELADVA agunk
   * tovabbvivo gombja sem az. A rez a FO cselekvest jeloli, nem minden gombot
   * -- ha mindegyik azt viselne, egyik sem jelolne semmit.
   *
   * === A LETILTOTT GOMB SZANDEKOSAN NEM REZ ===
   *
   * ELFOGYOTT allapotban a gomb ott all, de le van tiltva. Egy rez hatteru
   * letiltott gomb KATTINTHATONAK latszik: a szin a fo cselekvest igeri, a
   * viselkedes megtagadja. Ilyenkor a keszlet sajat letiltott stilusa marad,
   * es a rez elmarad -- a felirat pedig amugy is megmondja, mi az allapot.
   *
   * === A MAGASSAG AZOTA MEGJOTT, A SUGAR NEM (2026-09-08) ===
   *
   * Itt korabban ket elteres allt "mertem es nem valtoztatok meg" cimmel: a
   * magassag es a sugar. A magassag indoka az volt, hogy "a jobb oszlop
   * egeszet erinti" -- es a jobb oszlop azota MAGA A FELADAT lett (31183035
   * negyedik tetele, Balazs 13:32-es mondata: "legalabb a belso oldalakon
   * lehetne az ami a terveken van"). Az indok tehat elfogyott, nem az allitas
   * dolt meg.
   *
   * A MERES, MINDKET EPULO LAPON, a cselekves-sor teljes alakja:
   *
   *     sor      margin-top:18px; display:flex; gap:10px
   *     gomb     flex:1; height:54px; font-size:16px; font-weight:600
   *     2a       background oklch(0.62 0.13 45)  color oklch(0.15 0.014 45)
   *     1b       background oklch(0.55 0.13 45)  color #fff
   *
   * A ket szin BETURE a mar meglevo tokenek ket vilag-erteke, tehat a
   * magassag es a betu az EGYETLEN, ami hianyzott. Nem kellett hozza sem uj
   * token, sem dontes.
   *
   * ES EGY FUGGETLEN MEGEROSITES, amit erdemes tudni: az ELVETETT 1a lapon
   * ugyanez a gomb 52px. Vagyis az 54 nem "kerekitett" ertek, hanem a ket
   * epulo lap kozos ertekét adja, es az elvetett valtozattol meg is
   * kulonbozteti.
   *
   * === A SUGAR MARAD, ES MOST MAR TUDOM, MIERT ===
   *
   * A tervben a gomb sugara 0px, nalunk a keszlet gomb-stilusa adja. Ez nem
   * ennek a gombnak a kerdese, hanem minden gombe a lapon -- egy helyen
   * megvaltoztatva ez a gomb kilogna a tobbi kozul.
   *
   * === A HATOKOR, KIMONDVA: EZ MA A PANEL GOMBJA ===
   *
   * Harom hivohely importalja a `StockState`-et, de ma egy renderelodik: a
   * `mobile-actions.tsx` a regi agon all (`hasznaljaVazat` feltetel nelkul
   * igazat ad), a lebegő sav pedig a SAJAT cselekveset rajzolja, nem ezt a
   * dobozt. A terv a lebego savra MAS meretet ad (50px, 15px/600, padding
   * 0 24px) -- vagyis ha a regi ag valaha visszaterne, ez a magassag ott
   * ROSSZ lenne. Ezert all itt a szam mellett, hogy melyik uthoz tartozik.
   */
  const letiltva = disabled || availability === "ELFOGYOTT"

  return (
    <Button
      onClick={onAddToCart}
      disabled={letiltva}
      variant="primary"
      className={FO_GOMB_MERET}
      isLoading={isAdding}
      data-testid={testId}
      style={
        letiltva
          ? undefined
          : {
              background: "var(--terv-kiemel)",
              color: "var(--terv-kiemel-szoveg)",
            }
      }
    >
      {availabilityLabel[availability]}
    </Button>
  )
}
