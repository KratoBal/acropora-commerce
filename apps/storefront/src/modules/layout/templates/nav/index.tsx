import { Suspense } from "react"

import { listNonEmptyRootCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FejlecMenu } from "./fejlec-menu"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

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

const KERESO_HELYKITOLTO = "Keresés termékre, fajra, márkára, cikkszámra"

export default async function Nav({ countryCode }: { countryCode?: string }) {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)

  /**
   * A MENU A VALODI GYOKEREKBOL EPUL, DE CSAK A NEM URESEKBOL.
   *
   * Orszagkod nelkul (ha egy hivo nem adja at) inkabb URES a menu, mint egy
   * talalgatott regio: egy rossz regio arakat es elerhetoseget valtoztat.
   */
  const region = countryCode ? await getRegion(countryCode) : null
  const kategoriak = region ? await listNonEmptyRootCategories(region.id) : []

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header
        className="relative w-full border-b px-4"
        style={{
          borderColor: "var(--terv-keret)",
          background: "var(--terv-hatter)",
          color: "var(--terv-szoveg)",
        }}
        data-testid="fejlec"
      >
        <div
          /*
            A BETUMERET A TERVBOL: 12.5 pixel. A `text-xs` 12-t ad, tehat fel
            pixellel kisebbet -- kicsi kulonbseg, de a savban ez az EGYETLEN
            szovegmeret, es a terv kiirja.
          */
          className="mx-auto flex w-full items-center justify-between border-b text-[12.5px]"
          style={{
            height: "36px",
            maxWidth: "1352px",
            borderColor: "var(--terv-keret)",
            color: "var(--terv-szoveg-halvany)",
            fontFamily: "var(--terv-betu-fo-lanc)",
          }}
          data-testid="fejlec-bizalmi-sav"
          /*
            A DATUM JELOLOKENT ALL, NEM SZOVEGKENT: a vevonek nem mond semmit,
            de aki a lapot megnezi, latja, MIKORI a ket szam. Egy csak
            megjegyzesben allo datum a kitelepitett lapon nem letezik.
          */
          data-tanusitvany-allapot={BIZALMI_TANUSITVANY_DATUM}
        >
          <p>{BIZALMI_BAL}</p>
          {/*
            A JOBB OLDAL KET SZOVEG, HUSZONNEGY PIXEL KOZZEL, ELVALASZTO NELKUL.

            A tervforrasban (2026-09-09) ez all:

                <span style="display:flex;gap:24px">
                  <span>...</span>
                  <span style="color:REZ;font-weight:600">Szakértői segítség</span>
                </span>

            ITT KORABBAN EGY `·` PONT ALLT a ket szoveg kozott, nyolc pixeles
            kozzel. Az en betoldasom volt, kep alapjan, es a forrasban nincs.
            A tervben a ket szoveget a KOZ valasztja el, nem egy karakter.

            A `font-weight:600` is a forrasbol jon: a segitseg-felirat nem csak
            rez szinu, hanem felkover is.
          */}
          <p className="flex items-center gap-6">
            <span>{BIZALMI_TANUSITVANY}</span>
            <span
              className="font-semibold"
              style={{ color: "var(--terv-kiemel-tinta)" }}
            >
              {BIZALMI_SEGITSEG}
            </span>
          </p>
        </div>
        <nav
          /*
            A SAV MAGASSAGA A KOZOS VALTOZOBOL JON, MINUSZ AZ ALSO KERET.

            A `--fejlec-magassag` a TELJES fejlecet jelenti (sav plusz az 1
            pixeles keret). Ket olvasoja van: ez a sor es a termeklap jobb
            paneljenek tapadasi eltolasa. Ket kulon szam egyszer mar
            szetcsuszott: a panel 16 pixelre tapadt, a fejlec 79 magas volt, es
            a panel tetejebol 63 pixel eltunt alatta.
          */
          className="mx-auto flex w-full items-center gap-4 lg:gap-10"
          style={{
            height: "calc(var(--fejlec-magassag) - 1px)",
            maxWidth: "1352px",
            fontFamily: "var(--terv-betu-fo-lanc)",
          }}
        >
          {/* A TORESPONT ALATT a meglevo oldalso menu marad: a terv mobil
              kerete sajat fejlecet ir le, es az kulon tetel. */}
          <div className="lg:hidden">
            <SideMenu regions={regions} />
          </div>

          <LocalizedClientLink
            href="/"
            className="flex shrink-0 items-center gap-3"
            data-testid="nav-store-link"
          >
            <span
              className="block h-[30px] w-[30px]"
              style={{ background: "var(--terv-kiemel)" }}
              aria-hidden="true"
            />
            <span className="text-[21px] font-bold tracking-[0.1em]">
              ACROPORA
            </span>
          </LocalizedClientLink>

          <form
            action={countryCode ? `/${countryCode}/store` : "/store"}
            method="get"
            className="hidden flex-1 items-center gap-3 px-4 sm:flex"
            style={{
              height: "46px",
              background: "var(--terv-hatter-halvany)",
            }}
            data-testid="fejlec-kereso"
          >
            <span
              className="block h-[13px] w-[13px] shrink-0 rounded-full border-[1.5px]"
              style={{ borderColor: "var(--terv-szoveg-halvany)" }}
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="fejlec-kereso-mezo">
              {KERESO_HELYKITOLTO}
            </label>
            <input
              id="fejlec-kereso-mezo"
              type="search"
              name="q"
              placeholder={KERESO_HELYKITOLTO}
              className="h-full w-full bg-transparent text-[14px] outline-none"
              style={{ color: "var(--terv-szoveg)" }}
            />
          </form>

          <FejlecMenu kategoriak={kategoriak} />

          <div className="ml-auto flex shrink-0 items-center lg:ml-0">
            <Suspense
              fallback={
                <LocalizedClientLink
                  href="/cart"
                  className="flex h-[46px] items-center px-5 text-[14px] font-semibold"
                  style={{
                    background: "var(--terv-szoveg)",
                    color: "var(--terv-hatter)",
                  }}
                  data-testid="nav-cart-link"
                >
                  Kosár · 0
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
