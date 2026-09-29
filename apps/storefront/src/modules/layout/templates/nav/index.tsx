import { Suspense } from "react"

import { listNonEmptyRootCategories } from "@lib/data/categories"
import { fejlecMenuPontok } from "@lib/util/fejlec-menu-pontok"
import { KosarLink } from "@modules/layout/components/cart-dropdown/kosar-link"
import { getRegion } from "@lib/data/regions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FejlecMenu } from "./fejlec-menu"
import { MobilMenu } from "./mobil-menu"
import CartButton from "@modules/layout/components/cart-button"

/**
 * A FEJLEC FO SAVJA, A TERV SZERINT (2026-09-08).
 *
 * A tervben a fejlec KET savbol all: egy 36 pixeles felso csikbol es egy 78
 * pixeles fo savbol. ITT CSAK A FO SAV EPUL MEG.
 *
 * === A FELSO SAV MEGEPULT, ES MIND A HAROM SZOVEGNEK VAN DONTESE ===
 *
 * ITT KORABBAN AZ ALLT, HOGY A SAV NEM EPUL MEG, mert harom szovegehez hianyzik
 * valami. Mind a harom feloldodott, kulon-kulon:
 *
 *   "Elo megerkezesi garancia · Eloallat-szallitas minden szerdan"
 *       Balazs kikotese szerint ott, ahol a tartalom meg nincs eldontve, a TERV
 *       SZOVEGE all. Ez a mondat a tervbol jon, valtoztatas nelkul.
 *   az ARUKERESO-sor HELYETT "Fogyasztobarat tanusitvany"
 *       A regi sor kulso szolgaltatas adata volt, forras nelkul -- azt nem
 *       irtuk ki. Balazs valasza (2026-09-09): "van fogyasztobarat
 *       ertekelesunk. az keruljon oda".
 *       SZAM NINCS MELLETTE. A terven az Arukereso mellett 4,9 / 5 es 312
 *       ertekeles all; Balazs a tanusitvanyt nevezte meg, szamot nem adott
 *       hozza, es egy kitalalt szam ugyanaz a hiba lenne, mint az eredeti volt.
 *   "Szakertoi segitseg"
 *       Kiirjuk, de NEM LINK. Egy felirat, ami nem visz sehova, elfogadhato;
 *       egy link, ami rossz helyre visz, nem. Amint van cime, link lesz belole.
 *
 * === A MERETEK, ES HOGY MELYIK HONNAN JON ===
 *
 * MAGASSAG 36 pixel: a tervFAJLBOL, ahogy eddig is ebben a fejlecben allt.
 * A kuldott KEPBOL ez nem olvashato ki, mert a kep a sav TETEJET levagja: a
 * lathato resz 60 kep-pixel (27 CSS pixel), tehat kilenc pixel hianyzik.
 *
 * BETUMERET 12.5 pixel: a tervFORRASBOL, es EZ FELULIRT EGY KEPBOL SZAMOLT
 * SZAMOT.
 *
 * Itt korabban 12 pixel allt, kepbol szamolva: a kep leptekét a fo sav adja
 * meg (175 kep-pixel a 63. es a 238. sor kozott, ami a tervbeli 78 CSS
 * pixellel 2.2222-es leptek), es a sav szovege ezen nagyjabol 10 CSS pixel
 * magas betutesttel allt, amibol 12 pixel jott ki.
 *
 * A LEVEZETES JO VOLT, AZ EREDMENY MEGIS FEL PIXELLEL MELLE. A forras
 * `font-size:12.5px` erteket ir, mind a ket valasztott lapon. Egy kepbol
 * SZAMOLT ertek soha nem lehet pontosabb, mint a raszter, amibol jon.
 *
 * EZERT ALL ITT, ES NEM CSAK A SZAM VALTOZOTT: amit KEPBOL veszunk, azt meg
 * kell jelolni, mert a forras barmikor felulirja -- es forditva soha. Ez a
 * bekezdes maga a jelolés. (acrobot megfogalmazasa, 2026-09-09, uzenet 16852.)
 *
 * SZINEK a tokenekbol, es a parositast a FORRAS igazolja, BETURE:
 *
 *     a sav szovege           a tervben oklch(0.72 0.012 250)
 *     --terv-szoveg-halvany   soteten  oklch(0.72 0.012 250)   -- azonos
 *     a kiemelt szoveg        a tervben oklch(0.68 0.13 45)
 *     --terv-kiemel-tinta     soteten  oklch(0.68 0.13 45)     -- azonos
 *
 * ITT KORABBAN A KEPBOL MERT RGB-ERTEKEK ALLTAK (a sav szovege rgb(159,164,170)
 * a tokenunk rgb(159,165,172) erteke mellett, "ket egyseg" elteressel). Az a
 * parositas HELYES volt, de KOZELITO: egy raszterbol vett szin sosem lesz
 * pontosabb, mint a tomorites, amin atment.
 *
 * A forras EXAKT egyezest ad, tehat az erosebb allitas -- es ha valaha
 * elcsuszik, egy beture pontos par elcsuszasa LATSZIK, egy "ket egysegnyi"
 * kozelitese nem.
 *
 * === A SZINEK TOKENBOL JONNEK, ES EZ NEM STILUS-KERDES ===
 *
 * A terv MIND A HAROM lapjan ugyanaz a ket sav all, ugyanazzal a geometriaval,
 * de MAS szinekkel. Vagyis a geometria kozos, a szinek vilagonkent valtanak --
 * es pontosan ezt csinaljak a tokenek.
 *
 * MA A FEJLEC MINDIG VILAGOS, es ez nem hiba, hanem a mai allapot: a
 * `data-vilag` jelolot a vaz teszi ki a lapon BELUL, a fejlec pedig a `(main)`
 * elrendezesben all, a lap FOLOTT. acrobot dontese (2026-09-08): a fejlecnek
 * kovetnie KELL a termek vilagat, de az kulon kor -- az elrendezes ma nem
 * ismeri a termeket. Tokenekkel epitve az a kor egyetlen jelolo bekotese lesz.
 *
 * === AZ ERTEKEK, ES AMELYIK NEM EGYEZIK PONTOSAN ===
 *
 * A tervbeli 1b (vilagos) fejlec ertekei es a tokenjeink:
 *
 *   also keret     oklch(0.88 0.008 70)   = --terv-keret-meleg   PONTOS
 *   logo negyzet   oklch(0.55 0.13 45)    = --terv-kiemel        PONTOS
 *   kereso szoveg  oklch(0.5 0.012 60)    = --terv-szoveg-halvany PONTOS
 *   kosar hatter   oklch(0.2 0.012 60)    = --terv-szoveg        PONTOS
 *   kereso hatter  oklch(0.955 0.006 75)  ~ --terv-hatter-halvany (0.955 0.004 250)
 *   kosar szoveg   oklch(0.98 0.004 60)   ~ --terv-hatter        (0.99 0.004 80)
 *
 * A ket nem pontos ertek azonos vilagossagu, es a kulonbseg a szinezetben all,
 * 0.004 es 0.006 telitettseg mellett -- ott a szinezet nem lathato. Uj tokent
 * felvenni ezert nem szabad: az a ZAJT emelne szereppe.
 *
 * AZ ALSO KERET A `--terv-keret` ES NEM A `--terv-keret-meleg`, holott vilagosban
 * az utobbi a pontos. Az ok a SOTET oldal: ott a terv 0.28-at ker, ami betuere a
 * `--terv-keret`, mig a `--terv-keret-meleg` sotet erteke 0.33. Vilagosban a ket
 * token AZONOS vilagossagu es mindketto szinte semleges; sotetben viszont valodi
 * lepes van kozottuk. Ezert az a token megy be, ami a MERHETO kulonbseg helyen
 * pontos.
 */

/**
 * A KERESO A `/store` LAPRA VISZ, ES AZ A LAP MAR TUD KERESNI.
 *
 * Ez nem magatol ertetodo: a `/store` utvonal a `q` parametert nem olvasta, es
 * egy kereso mezo, ami egy szuretlen listara visz, rosszabb, mint ha nem lenne.
 * A kepesseg merve van a teszt bolton (cikkszam, fajnev, csak-leirasban allo
 * szo, plusz pozitiv es negativ kontroll).
 *
 * A HELYKITOLTO SZOVEG A TERVBOL JON, az 1b lapjarol. A 2a lapon "fajra" all
 * "markara" helyett -- lap-fajta szerinti elteres, amit egy KOZOS fejlec ma nem
 * tud kifejezni. Az 1b a valasztott valtozat, tehat az o szovege all itt.
 */
/**
 * A HELYKITOLTO NEGY DOLGOT IGER, ES A HATARUK KOZOS.
 *
 * === ITT KORABBAN EGY ELEMZES ALLT, AMI MAS SZOVEGROL SZOLT ===
 *
 * A regi valtozat harom igeretet targyalt, es a harmadikat "fajra" neven -- a
 * kodban viszont "markara" allt. Az elemzes egy olyan szot magyarazott, ami nem
 * szerepelt a szovegben. Az egyik ket dolog kozul rossz volt, es most mind a
 * ketto javul.
 *
 * === MIERT NEGY, ES NEM HAROM ===
 *
 * A terv 2a lapja "fajra", az 1b "markara" szot ir. Ez KET KULON fejlec volt.
 * A mienk mostantol MIND A KET vilagot kiszolgalja (a fejlec koveti a termek
 * vilagat), tehat egy szoveg all ket lapra: egy elo allat lapjan a "fajra" a
 * hasznos szo, egy muszaki termeken a "markara". Ha egyet valasztunk, az egyik
 * lapon olyat kinalunk, ami ott ertelmetlen.
 *
 * === A KOZOS HATAR, ES EZ A FONTOSABB RESZ ===
 *
 * NINCS strukturalt marka-mezo, es nincs faj-mezo. A kereses HAROM helyre
 * illeszkedik: a cimre, a LEIRASRA es a cikkszamra. Merve a teszt bolton
 * (2026-09-09, `/store/products?q=...`):
 *
 *     q=ATB           111 talalat -- a mintaban 0/5 CIMBEN, de mind a negynel
 *                     a LEIRASBAN igen
 *     q=Aquaforest     79 talalat -- 3/5 cimben, a tobbi a leirasban
 *     q=austea          1 talalat -- cimben
 *     q=zzzzqqqq        0 talalat -- negativ kontroll
 *
 * EBBOL KOVETKEZIK, HOGY A NEGYBOL HAROM UGYANAZON AZ ALAPON ALL: a szo akkor
 * talal, ha a termek CIMEBEN vagy LEIRASABAN ott van. Ha egy marka neve egyik
 * helyen sem szerepel, arra a szora NEM talal ra -- es nem hibazik, csak nem
 * talal.
 *
 * A "cikkszamra" az egyetlen, ami SAJAT MEZON all: a kereses a `sku` mezore is
 * illeszkedik (merve: `q=156161` es `q=4011708350249`, tisztan szamjegyes
 * cikkszamok, amik a termek nevében sehol nem szerepelnek).
 *
 * A SZAMOK AZERT ALLNAK ITT, mert egy ilyen mondat mellett a meres az, ami
 * hitelesit. Egy megjegyzes, ami csak allit, fel ev mulva ugyanolyan
 * ellenorizhetetlen, mint amit felvaltott.
 */
/**
 * A FELSO SAV HAROM SZOVEGE. Kulon allandok, mert kulon dontes all mindegyik
 * mogott, es a kovetkezo olvaso ne egy hosszu JSX-bol probalja kihamozni,
 * melyik honnan jon.
 */
const BIZALMI_BAL =
  "Élő megérkezési garancia · Élőállat-szállítás minden szerdán"
/**
 * A KANONIKUS KERET SAJAT BAL SZOVEGE (217:42), acrobot dontese
 * (2026-09-29 07:27): igaz allitas (a handoff uzleti szabalya: elo allatnal
 * csak szemelyes atvetel), tehat a mi szovegeink MELLE kerul, ha elfer. Elfer:
 * a sav 1352 pixelebol a ket oldal egyutt kb. 1050-et foglal (merve a kirakaton).
 * A Figma jobb oldali "Árukereső 4,9 / 5 · 312 értékelés" mintaszoveg; kitalalt
 * ertekelesszam nem kerulhet a vevo ele, ott a mi tanusitvanyunk marad.
 */
const BIZALMI_ATVETEL = "Élő állat: kizárólag személyes átvétel"
/**
 * A TANUSITVANY ES A KET SZAMA -- STATIKUS ERTEK, MERT NINCS LEKERDEZESUNK.
 *
 * Balazs szava (2026-09-09 11:06:53Z): "az jelenleg 4.8 213 ertekelesbol", es
 * ket masodperccel kesobb: "aztan majd bekotjuk, addig legyen statikus".
 *
 * A SZOVEG AZ O SZAVAT KOVETI: "ertekelesbol", nem "velemenybol". Elso
 * valtozatomban az utobbi allt, egy masodkezi atirasbol -- a szo ket kezen at
 * megvaltozott, es a forras mondja meg, melyik a helyes.
 *
 * A ket szam A FENTI NAP ALLAPOTA, es NEM frissul magatol: nincs olyan
 * hivasunk, ami a tanusitvany oldalarol lehozna. Ez BALAZS DONTESE, nem a mi
 * kenyelmunk -- es ezert nem is epitettunk hozza sem lehivast, sem helyet egy
 * jovobeli adatforrasnak. A bekotes kesobb jon, es akkor dol el, honnan.
 *
 * EZERT ALL ITT A DATUM, ES NEM DISZ: egy szam, ami a vevo elott all es nem
 * frissul, egy ev mulva is ugyanezt fogja mondani. Aki ide nez, lassa, mikori.
 *
 * AMI EZZEL LEZARULT: az eredeti tervbeli sor ("Arukereso 4,9 / 5 · 312
 * ertekeles") azert nem epult meg, mert KULSO szolgaltatas adata volt, forras
 * nelkul. Ez a ket szam a SAJAT tanusitvanyunke, es a gazdatol jon.
 */
const BIZALMI_TANUSITVANY_DATUM = "2026-09-09"
const BIZALMI_TANUSITVANY =
  "Fogyasztóbarát tanúsítvány · 4,8 · 213 értékelésből"
const BIZALMI_SEGITSEG = "Szakértői segítség"

/**
 * A KERESO HELYKITOLTOJE -- SZANDEKOS ELTERES A TERVTOL.
 *
 * EZT A SORT AZERT KELL ITT LEIRNI, mert enelkul valaki egyszer "kijavitja" a
 * terv szerintire, es azzal az elo allat lapokrol eltunik a "márkára".
 *
 * === MIT AD A TERV, ES MIT ADUNK MI ===
 *
 *     2a (elo allat)   Keresés termékre, fajra, cikkszámra
 *     1b (muszaki)     Keresés termékre, márkára, cikkszámra
 *     nalunk           Keresés termékre, fajra, márkára, cikkszámra
 *
 * A terv tehat HAROM szot ad, es LAPONKENT MAST: a fajt csak az elo allat
 * lapjan, a markat csak a muszakin. A mi alakunk a ketto egyesitese, vagyis
 * egy HARMADIK valtozat -- ezt picasso merte a kitelepitett lapon
 * (2026-09-09), es nem elnezes.
 *
 * === MIERT MARAD IGY (acrobot dontese, 2026-09-09 16:55) ===
 *
 * Egy KOZOS fejlec-komponensunk van. A helykitolto termek-tipustol valo
 * fuggese olyan agat nyitna (a fejlecnek tudnia kellene, milyen lapon all),
 * ami tobbe kerul, mint amennyit er -- a kereso mindket esetben ugyanabba a
 * boltba keres.
 *
 * ES A NEGYSZAVAS ALAK IGAZ MIND A KET VILAGRA, mig a terv ket alakja
 * kulon-kulon HIANYOS: a 2a valtozat elhallgatja, hogy markara is lehet
 * keresni, az 1b pedig azt, hogy fajra. Egy helykitolto, ami kevesebbet
 * iger, mint amit a kereso tud, nem pontosabb, hanem szegenyebb.
 *
 * === MI VALTOZTATNA EZEN ===
 *
 * Ha a fejlec valaha MEGIS megtudja, milyen lapon all (peldaul mert mas okbol
 * kell neki), akkor ez a dontes ujranyithato -- de akkor sem magatol: a fenti
 * "hianyos" erv a terv KET alakjara akkor is all.
 */
const KERESO_HELYKITOLTO = "Keresés termékre, fajra, márkára, cikkszámra"

/** A Figma fejlec-frame-jeinek jobb oldali szovege (234:37, 253:58). */
const FIOK_FELIRAT = "Fiók"

/** A kereso sav szakerto-gombja (217:69); celoldal meg nincs, a Hamarosan lapra visz. */
const SZAKERTO_FELIRAT = "Kérdezz a szakértőnktől"

export default async function Nav({ countryCode }: { countryCode?: string }) {
  /**
   * A MENU A VALODI GYOKEREKBOL EPUL, DE CSAK A NEM URESEKBOL.
   *
   * Orszagkod nelkul (ha egy hivo nem adja at) inkabb URES a menu, mint egy
   * talalgatott regio: egy rossz regio arakat es elerhetoseget valtoztat.
   */
  const region = countryCode ? await getRegion(countryCode) : null
  const menuAdat = region
    ? await listNonEmptyRootCategories(region.id)
    : { gyokerek: [], nevek: new Map<string, string>() }
  /*
    A MENU A KANONIKUS KERETBOL (215:41, Balazs 2026-09-29: "a menu is minden
    elemevel"): nyolc pont, a keret sorrendjeben, asztalon es mobilon. A
    katalogus csak azt donti el, hova mutat egy pont (`fejlecMenuPontok`).
  */
  const menuPontok = fejlecMenuPontok(menuAdat.gyokerek)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/*
        P1b (2026-09-29): A FEJLEC A FIGMA FEJLEC-FRAME-JEIBOL, AZ `acr`
        TOKENEKKEL. A szinek a MOD-tokenekbol jonnek (`--acr-mode-*`), tehat
        ugyanez a jeloles Commerce (vilagos) es Reef (sotet): a `data-fejlec`
        jelolon at a lap sotet vilaga (termeklap) vagy Reef-jeloloje
        (kategorialap) atkapcsolja, lasd `acropora-tokens.css`.

        A KANONIKUS KERETEK (Balazs, 2026-09-29 05:23 UTC): asztalon a 215:41
        (WYSIWYG Coral PDP 2a Hybrid), mobilon a 220:3. Asztalon HAROM sav
        all, egymas alatt, mindegyik teljes szelessegu, sajat also kerettel:
          bizalmi sav   217:41   36 px
          fejlec sav    217:46   76 px   marka, menu, (ures 370 px), Fiók, Kosár
          kereso sav    217:62   70 px   mezo + szakerto-gomb
        Mobilon csak a fejlec sav all (220:4, 56 px). Az elteresek es az okuk:
        `docs/P1B-HEADER.md`.
      */}
      <header
        className="relative w-full bg-acr-mode-bg font-acr-sans text-acr-mode-text"
        data-fejlec
        data-testid="fejlec"
      >
        <div
          className="hidden border-b border-acr-mode-border px-[44px] small:block"
          style={{ height: "var(--fejlec-bizalmi-magassag)" }}
          data-testid="fejlec-bizalmi-sav"
          data-tanusitvany-allapot={BIZALMI_TANUSITVANY_DATUM}
        >
          <div className="mx-auto flex h-full w-full max-w-[1352px] items-center justify-between text-[12.5px] leading-[16px]">
            {/*
              1024 ES 1280 KOZOTT AZ ATVETELI MONDAT NEM FER KI: a ket oldal
              egyutt ~1000 pixel, a sav belseje 1024-nel 936 (merve: a szoveg
              ket sorba tort, 32 px). A Figma csak 1440-et rajzol; ez a mi
              reszponziv szabalyunk.
            */}
            <p>
              <span className="hidden medium:inline">{BIZALMI_ATVETEL} · </span>
              {BIZALMI_BAL}
            </p>
            <p className="flex items-center gap-6">
              <span>{BIZALMI_TANUSITVANY}</span>
              <span className="font-semibold text-acr-heritage">
                {BIZALMI_SEGITSEG}
              </span>
            </p>
          </div>
        </div>
        <div className="border-b border-acr-mode-border px-[18px] small:px-[44px]">
          <nav
            /*
              A NYOLC MENUPONT 1024-NEL 28 PIXELLEL NEM FERT EL (merve: a menu
              620 szeles, a tartalma 648). 1280 alatt szukebb kozok, folotte a
              Figma 28 es 18 pixele.
            */
            className="mx-auto flex w-full items-center gap-[14px] small:gap-[20px] medium:gap-[28px]"
            style={{
              height: "calc(var(--fejlec-magassag) - 1px)",
              maxWidth: "1352px",
            }}
          >
            <MobilMenu
              pontok={menuPontok}
              keresoCel={countryCode ? `/${countryCode}/store` : "/store"}
            />
            <LocalizedClientLink
              href="/"
              className="flex min-w-0 shrink-0 items-center gap-[14px] small:gap-3"
              data-testid="nav-store-link"
            >
              <span
                className="block h-[22px] w-[22px] shrink-0 bg-acr-heritage small:h-[30px] small:w-[30px]"
                aria-hidden="true"
              />
              <span className="text-[16px] font-bold leading-[21px] tracking-[1.5px] text-acr-mode-heading small:text-[20px] small:leading-[26px] small:tracking-[2.1px]">
                ACROPORA
              </span>
            </LocalizedClientLink>
            <div className="hidden min-w-0 small:flex">
              <FejlecMenu pontok={menuPontok} nevek={menuAdat.nevek} />
            </div>
            {/*
              A 370 PIXELES HELY A FEJLEC SAVBAN URES (217:59 "nav-spacer"):
              a kereso a sajat savjaban all, alatta. A P1b ide tette, ez
              tevedes volt (2026-09-29-en visszamerve, minden Reef keretben).
            */}
            <div className="ml-auto flex shrink-0 items-center gap-[28px] text-[13px] leading-[17px]">
              <LocalizedClientLink
                href="/account"
                className="hidden small:inline"
                data-testid="nav-account-link"
              >
                {FIOK_FELIRAT}
              </LocalizedClientLink>
              <Suspense fallback={<KosarLink darab={0} />}>
                <CartButton />
              </Suspense>
            </div>
          </nav>
        </div>
        <div
          className="hidden border-b border-acr-mode-border px-[44px] small:block"
          style={{ height: "var(--fejlec-kereso-magassag)" }}
          data-testid="fejlec-kereso-sav"
        >
          <div className="mx-auto flex h-full w-full max-w-[1352px] items-center gap-3">
            <form
              action={countryCode ? `/${countryCode}/store` : "/store"}
              method="get"
              className={
                "flex h-[46px] min-w-0 flex-1 items-center gap-[10px] border border-acr-mode-border px-[15px] " +
                "focus-within:outline focus-within:outline-2 " +
                "focus-within:outline-offset-2 " +
                "focus-within:[outline-color:var(--acr-color-heritage)]"
              }
              style={{ background: "var(--fejlec-mezo-hatter)" }}
              data-testid="fejlec-kereso"
            >
              <svg
                viewBox="0 0 18 18"
                className="h-[18px] w-[18px] shrink-0 text-acr-mode-text"
                aria-hidden="true"
              >
                <circle
                  cx="8.25"
                  cy="8.25"
                  r="5.25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.35"
                />
                <path
                  d="M12.25 12.25 15 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                />
              </svg>
              <label className="sr-only" htmlFor="fejlec-kereso-mezo">
                {KERESO_HELYKITOLTO}
              </label>
              <input
                id="fejlec-kereso-mezo"
                type="search"
                name="q"
                placeholder={KERESO_HELYKITOLTO}
                className="h-full w-full bg-transparent text-[14px] text-acr-mode-heading outline-none placeholder:text-acr-mode-text"
              />
            </form>
            <LocalizedClientLink
              href="/hamarosan/szakerto"
              className="flex h-[46px] w-[220px] shrink-0 items-center justify-center border border-acr-heritage text-[13px] font-semibold leading-[17px] text-acr-mode-heading"
              data-testid="fejlec-szakerto"
            >
              {SZAKERTO_FELIRAT}
            </LocalizedClientLink>
          </div>
        </div>
      </header>
    </div>
  )
}
