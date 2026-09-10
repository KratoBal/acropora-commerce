import { HttpTypes } from "@medusajs/types"
import { besorolasUt } from "@lib/util/kategoria-fa"
import { sanitizeDescription } from "@lib/util/sanitize-description"
import ProductDescriptionTabs from "@modules/products/components/product-description-tabs"
import React from "react"

import {
  ArDoboz,
  DoaGarancia,
  ArAlattiSor,
  ElerhetosegDoboz,
  KiszerelesSor,
  MennyisegDoboz,
  ValasztoDoboz,
} from "../vasarlas/dobozok"
import {
  hasonloAzonositok,
  kiegeszitoAzonositok,
} from "../related-products/gondozott-kapcsolatok"
import {
  maximumOrderQuantity,
  minimumOrderQuantity,
  orderQuantityHint,
  orderQuantityStep,
} from "../product-actions/minimum-order-quantity"
import { scarcityCountOf, uniquePieceOf } from "../stock-state/availability"
import { vanValaszthatoOpcio } from "@modules/products/components/product-actions/valaszthato-opciok"
import { KepBlokk } from "../image-gallery/kep-blokk"
import { vilagaTermeknek } from "./vilag-valto"

/**
 * A VAZ SLOTJAINAK VALODI TARTALMA -- CSAK OTT, AHOL VAN FORRAS.
 *
 * Balazs kikotese (acrobot atadasaban, szo szerint): "de ami mar megvan az
 * epuljon bele!!! kepek leirasok stb stb". A masik fele ugyanolyan kotelezo:
 * ami nincs, ott a doboz ALLJON A HELYEN, uresen -- es kitalalt adat nem kerul
 * bele.
 *
 * === MI VAN, ES MI NINCS -- MERVE A STAGE-EN, NEM FELTETELEZVE ===
 *
 * Egy muszaki termek (amtra-tds-ec-digitalis-tds-mero) mezoi:
 *
 *   title            van
 *   thumbnail        van, plusz 2 kep
 *   description      1940 karakter, ep HTML
 *   categories       6 db, mpath-tal
 *   variants         1 db, "Kivitel" opcioval
 *   sku              a valtozaton
 *   metadata         unas_unit, unas_product_url, unas_short_description,
 *                    unas_minimum_order_quantity
 *
 * AMI NINCS, es ezert marad ures:
 *
 *   MARKA            a metaadatban nincs marka-kulcs (a negy letezobol egyik sem az)
 *   MUSZAKI PARAMETER strukturaltan sehol -- KULON MEZOKENT nincsenek. De a
 *                    korabbi allitasom ("sehol") TUL EROS volt: a leirasba
 *                    agyazott TABLAZATOKBAN ott allnak (189 termek a teljes
 *                    katalogusban), es a #50 ful-komponense KI IS EMELI oket egy
 *                    "Muszaki adatok" fulre. Vagyis nem hianyoznak: a fulek
 *                    dobozaban jelennek meg, nem kulon dobozban.
 *   CSOMAGAJANLAT    nincs forrasa
 *   TARTOZEKOK       nincs forrasa
 *   HASONLO TERMEKEK nincs forrasa
 *   MERETEZES-SEGED  szamitas, nem adat
 *
 * Az AR kulon eset: a nyers `/store/products` hivas `calculated_price: null`
 * erteket ad, mert nem adtam meg regiot. A kirakat sajat adat-retege atadja a
 * `countryCode`-ot, es akkor van ar -- tehat az ar VAN, csak a lekerdezes
 * modjatol fugg. Ezt kimondom, mert egy `null` konnyen latszik hianyzo adatnak.
 */

type Termek = HttpTypes.StoreProduct

/**
 * A LANCHOZ ELEG EZ A HAROM MEZO, es szandekosan nem a teljes Medusa tipus:
 * igy a fuggveny fixtura-baratabb, es a szerzodese is olvashato marad.
 *
 * A MEZOK ELHAGYHATOK, mert a hivo (`KategoriaKatalogus`) is ilyet ad. A
 * szukitest a `besorolasUt` vegzi, egy helyen -- egy szigorubb tipus itt csak
 * annyit erne el, hogy a hivonak kellene kasztolnia, es a kaszt pont azt a
 * ellenorzest utne ki, amiert a tipus letezik.
 */
type BesorolasKategoria = {
  id?: string | null
  name?: string | null
  parent_category_id?: string | null
}

/** A vevonek szant, semleges mertekegyseg-felirat. */
function egysegFelirat(termek: Termek): string | null {
  const egyseg = (termek.metadata as Record<string, unknown> | null)?.unas_unit
  return typeof egyseg === "string" && egyseg.trim() ? egyseg.trim() : null
}

/**
 * A CIKKSZAM. KIVITELEZVE, MERT KET HELY OLVASSA.
 *
 * A cim-blokk irja ki a cim alatt, es a MORZSAMENU utolso eleme is ez a
 * tervlapon (`KORALLOK / WYSIWYG / SPS / A-1042`). Ket masolat egy kesobbi
 * valtozasnal szetcsuszna -- ugyanaz a hiba, amit ma delelott ketszer
 * javitottunk.
 */
export function cikkszam(termek: Termek): string | null {
  const v = termek.variants?.[0]
  return v?.sku && v.sku.trim() ? v.sku.trim() : null
}

/**
 * A LEGMELYEBB KATEGORIA NEVE. A tervben a cim alatt egy besorolas all; a
 * legmelyebb ut a legbeszedesebb, mert a gyoker mindenkinel ugyanaz
 * ("Termekek").
 *
 * === MIERT NEM AZ mpath MEZO, HOLOTT AZ EGYSZERUBB VOLNA ===
 *
 * Eredetileg az `mpath` pontjait szamoltam. Az ERTEK ott van (merve az elo
 * API-n, `fields=*categories`: minden kategoria visel `mpath`-ot,
 * pont-elvalasztott azonositokkal) -- de a TIPUS nem ismeri: a
 * `StoreProductCategory` deklaracioja nem tartalmaz `mpath` mezot. Ket
 * TS2559 allt emiatt a fo agon, es a CI szerkezetileg nem lathatta.
 *
 * A javitas NEM a tipus kiszelesitese. Egy sajat bovites azt allitana a
 * szerverrol, amit en hiszek rola, es a most bekapcsolt tipus-kapu az elso
 * napon lenne megkerulve.
 *
 * Helyette a `parent_category_id` mezo, amit a tipus MAR ISMER
 * (`BaseProductCategory`, string | null), es amit az API ugyanugy visszaad
 * (ugyanaz a meres). A legmelyebb kategoria az, AMIRE A HALMAZBAN SENKI NEM
 * MUTAT SZULOKENT -- vagyis a levél.
 *
 * === ES AMIT EZ MASKEPP CSINAL, MERT NEM UGYANAZ A KETTO ===
 *
 * Merve ugyanabban a valaszban, ket valodi termeken:
 *
 *   ahol a teljes os-lanc visszajon (6 kategoria), az mpath-szamlalas es a
 *   level-kereses UGYANAZT a halmazt adja
 *   ahol CSAK a hozzarendelt kategoria jon vissza (1 kategoria, harom szintu
 *   mpath-tal), a level-kereses ugyanazt az egyet adja
 *
 * Marad egy eset, ahol a ketto elterhet: ha a halmazban ket fuggetlen ag
 * levele all. Ott az mpath a MELYEBBET valasztana, a level-kereses az
 * ELSOT. Egyik sem "helyesebb" -- a terv egyetlen besorolast mutat, es
 * mindketto egy valodi, hozzarendelt kategoria neve.
 */
/**
 * A BESOROLAS LANCA, A GYOKER NELKUL, ROVID NEVEKKEL.
 *
 * A levezetes a `besorolasUt` kozos fuggvenyben all: ugyanazt hasznalja a
 * morzsamenu is. Itt csak ket dolog tortenik: a gyoker lekerul (a tervlapon a
 * cim folotti sor nem ismetli meg), es a ROVID nevet vesszuk.
 *
 * === ITT KORABBAN A TERMEK SAJAT KATEGORIAI ALLTAK, ES A SOR SOHA NEM LATSZOTT ===
 *
 * A regi valtozat a `termek.categories` tombben keresett SZULO NELKULI elemet.
 * A bolt viszont csak a hozzarendelt (LEVEL) kategoriakat adja vissza, tehat
 * gyoker soha nem volt kozottuk, es a fuggveny mindig ures listat adott.
 *
 * MERVE 2026-09-09, a kitelepitett bolton: TIZENHAROM termeklapbol NULLA-n
 * jelent meg a sor. Ismert pozitiv kontrollal (a szomszedos jelolok ugyanazzal
 * a keresessel megvoltak), tehat a nulla nem a keresesem tulajdonsaga volt.
 *
 * A HIBA FAJTAJA: nem hianyzo vegpont es nem jogosultsag. A mechanika kesz
 * volt, csak nem arra a bemenetre epult, ami rendelkezesre all -- es a hianya
 * NEMA volt, mert egy meg nem jeleno sor pontosan ugy nez ki, mint egy sor,
 * aminek nincs mit mutatnia.
 */
export function besorolasLanc(
  termek: Termek,
  kategoriak: BesorolasKategoria[] = [],
): string[] {
  return besorolasUt(termek, kategoriak)
    .slice(1)
    .map((elem) => elem.nev)
}
export function legmelyebbKategoria(termek: Termek): string | null {
  const katok = termek.categories ?? []
  if (katok.length === 0) return null

  const szulokent = new Set(
    katok.map((k) => k.parent_category_id).filter(Boolean),
  )
  const levelek = katok.filter((k) => !szulokent.has(k.id))

  /**
   * A TARTALEK-AG DISZLET, ES EZT KIMONDOM, NEM ELHALLGATOM.
   *
   * Kalibralva: az egesz `levelek.length ? ... :` elhagyasa NULLA allitast
   * dont pirosra. Nem azert, mert az allitasaink gyengek, hanem mert az az ag
   * valodi adaton NEM TUD ELSULNI: egy fa halmazaban a legfelso visszaadott
   * kategoria szuloje mindig KIVUL van a halmazon, tehat level mindig van.
   *
   * Bent marad, mert egy ures nev rosszabb, mint egy vedelem, ami sosem sul el
   * -- de aki ezt olvassa, tudja, hogy NINCS MERVE, es ne higgye annak.
   */
  const valasztott = (levelek.length ? levelek : katok)[0]
  const nev = valasztott?.name?.trim()
  return nev ? nev : null
}

/**
 * A CIMSOR TARTALMA. A nev mindig van; a besorolas es a cikkszam nem, es ha
 * nincs, nem irunk a helyukre semmit.
 */
export const Cimsor = ({
  termek,
  kategoriak,
}: {
  termek: Termek
  kategoriak?: BesorolasKategoria[]
}) => {
  const lanc = besorolasLanc(termek, kategoriak)

  return (
    /* A HEZAG A TERVBOL: a cim `margin-top` erteke 8 px mobilon, 10 asztalon. */
    <div className="flex flex-col gap-2 lg:gap-2.5">
      {/*
        A BESOROLAS SORA REZ SZINU, ES A LANCOT MUTATJA, NEM EGY NEVET.

        Itt korabban a LEGMELYEBB kategoria allt egyetlen, halvany sorban. A
        tervlapon a cim folott a LANC all (`WYSIWYG · SPS · ACROPORIDAE`), rez
        szinnel -- ket kulonbseg, es mind a ketto a tervbol jon.

        A harmadik elem (a csalad-nev) nalunk NINCS, es nem is talaljuk ki: az
        indoklas a `besorolasLanc` fejleceben all.
      */}
      {lanc.length > 0 && (
        <p
          className="text-xs uppercase tracking-wide"
          /*
            A REZ SZOVEG-VALTOZATA, NEM A FELULETI. Elso valtozatomban a
            `--terv-kiemel` allt itt, es KET meglevo orzo azonnal pirosra
            fordult: a `rez-szerepek.spec.ts` szerint `color:` poziciohoz
            kizarolag a `--terv-kiemel-szoveg` es a `--terv-kiemel-tinta`
            hasznalhato. A `--terv-kiemel` FELULET-token (akcent hatter), es
            szovegkent a ket vilag egyiken olvashatatlan lenne.
          */
          style={{ color: "var(--terv-kiemel-tinta)" }}
          data-testid="vaz-besorolas"
        >
          {lanc.join(" · ")}
        </p>
      )}
      {/*
        A CIM MERETE A TERVBOL JON, ES A KET CHOSEN LAP UGYANAZT MONDJA.

        Merve a tervforrasbol (2026-09-09), lapokent es nezetenkent bontva:

            2a asztali   36 px   sorkoz 1.1    betukoz -0.02em
            1b asztali   36 px   sorkoz 1.1    betukoz -0.02em
            2a mobil     24 px   sorkoz 1.15   betukoz nincs
            1b mobil     24 px   sorkoz 1.15   betukoz nincs

        A HARMADIK LAP ERTEKE SZANDEKOSAN NINCS ITT: az 1a (elvetett) cime
        29 pixeles, -0.015em betukozzel. Ugyanaz a csapda, mint a ket
        token-ertekunk, ami az 1a laprol jott -- ezert all ra allitas is.

        A `text-2xl` sajat sorkoze 32 pixel (1.333), ezert kell a `leading`
        kulon: a meret onmagaban nem allitja be a terv sorkozet.
      */}
      <h1
        className="text-2xl font-semibold leading-[1.15] lg:text-[36px] lg:leading-[1.1] lg:tracking-[-0.02em]"
        data-testid="vaz-termek-nev"
      >
        {termek.title}
      </h1>
      {/*
        A CIKKSZAM KIKERULT A CIM ALOL, ES EZ NEM ELVESZETT ADAT.

        A tervlapon a cim-blokk harom sorbol all: besorolas, cim, dolt alcim --
        cikkszam NINCS kozottuk. A cikkszam a MORZSAMENU vegen all
        (`KORALLOK / WYSIWYG / SPS / A-1042`, #274 ota), es a terven a jobb
        panelben is, a brutto-ar soraban.

        AZERT MOST KERULT KI, ES NEM KORABBAN: amig a morzsamenu a termek NEVET
        mutatta a sor vegen, a cikkszam CSAK itt latszott a lapon. Elobb
        kivenni annyi lett volna, mint eltuntetni.

        AMI MEG NEM EPULT MEG: a jobb panel "Bruttó ár · Cikkszám · Egyedi
        példány" sora. A vaz megjegyzesei mar szamon tartjak (`ar -> brutto`),
        de szakasz meg nincs ra -- es abban a sorban a harmadik elem egy
        ALLITAS a peldanyrol, nem formazas, tehat kulon dontes.
      */}
    </div>
  )
}

/**
 * A FOTO. A tervben 16:10 arany all; a kirakat `unoptimized` modban dolgozik,
 * tehat sima `img` megy ki. Ha nincs kep, a doboz URES marad -- a hivo dolga,
 * hogy ilyenkor ne adjon tartalmat.
 *
 * === A TOBBI KEP ITT KORABBAN SEHOL NEM LATSZOTT ===
 *
 * Ez az ut a NEM elo-allat termekeke, es eddig PONTOSAN EGY kepet mutatott (a
 * bolyegkepet vagy az elsot). A tobbi kep letezett az adatban, es nem jelent
 * meg sehol: a teszt bolton merve szaz termekbol harmincnyolcnak van egynel
 * tobb kepe.
 *
 * Balazs kerese ("a tobbi kep a nagy kep ala kicsiben") tehat itt nem
 * atrendezes, hanem egy nem lathato adat megjelenitese. A szam es a mobil
 * viselkedes indoklasa a `kep-meret.tsx` fajlban all, kozosen a galeriaval.
 */
export const Foto = ({ termek }: { termek: Termek }) => {
  const kepek = termek.images ?? []

  /*
    A BOLYEGKEP A LISTA ELEJERE KERUL, HA NINCS BENNE.

    A `thumbnail` nem feltetlenul azonos a kepek elsojevel; ha kulon all,
    akkor is o a nagy kep indulaskor. A sor ezert a TELJES keszletet kapja, a
    bolyegkeppel egyutt -- egy csempe, ami eltunik, amikor ranyomsz, a
    valasztast is elrejti.
  */
  const bolyeg = termek.thumbnail
  const teljes =
    bolyeg && !kepek.some((k) => k.url === bolyeg)
      ? [{ id: "bolyeg", url: bolyeg }, ...kepek]
      : kepek

  return <KepBlokk kepek={teljes} alt={termek.title ?? ""} />
}

/**
 * A LEIRAS. Ugyanaz a tisztitas, mint a mai termeklapon -- nem masolat, hanem
 * UGYANAZ a fuggveny, tehat az engedelyezett lista egy helyen all.
 */
export const Leiras = ({ termek }: { termek: Termek }) => {
  const tiszta = sanitizeDescription(termek.description)
  if (!tiszta) return null

  return (
    <div
      className="text-sm [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_table]:block [&_table]:overflow-x-auto"
      data-testid="vaz-leiras"
      dangerouslySetInnerHTML={{ __html: tiszta }}
    />
  )
}

/**
 * A KAPCSOLATFELVETEL DOBOZ -- ES AMI SZANDEKOSAN HIANYZIK BELOLE.
 *
 * A tervben HAROM sor all ebben a dobozban, es csak KETTOT irunk meg:
 *
 *   cim              a doboz sajat felirata, lapcsaladonkent mas
 *   egy mondat       TERMEK-SPECIFIKUS, es NEM irjuk meg
 *   telefonszam      14px/600, rez SZINU szoveg
 *
 * A KOZEPSO MONDAT AZERT MARAD KI, mert termek-tudast igenyel, ami nincs meg.
 * A tervbeli ket peldany: "Ez a torzs 2019 ota nalunk no. Ha bizonytalan vagy a
 * viz parametereiben, hivj minket." (2a) es "Tobb mint 20 akvariumot
 * szereltunk fel ezzel a lampaval..." (1b). Egyik sem vezetheto le semmilyen
 * mezobol, tehat kitalalas lenne. Ugyanaz a szabaly, mint a meretezes-segednel.
 *
 * A TELEFONSZAM VISZONT NEM UJ ADAT: mar ELESBEN all a kirakatban, az ures
 * kosar uzenetben, `tel:+36202676801` alakban, allitassal egyutt. Masodszori
 * felhasznalas, nem talalgatas.
 *
 * A SZIN A `--terv-kiemel-tinta`, NEM a `--terv-kiemel`. Az elso a rezen allo
 * TINTA (a szoveg all benne), a masodik a FELULET (a gomb all rajta). A ket
 * szerep a vilagos lapon egybeesik (0.55), a soteten NEM (0.68 kontra 0.62) --
 * es ez a doboz a token elso hivohelye. (acrobot dontese, msg_id 14872.)
 *
 * A CIM NEM ITT ALL: a `lap-vaz/index.tsx` szakasz-listaja adja, vilagonkent
 * kulon ("Kerdezd minket" a vilagos lapon, "Kerdezd a boltot" a soteten) --
 * mind a ketto a terv sajat szava.
 */
export const TELEFON_MEGJELENITVE = "+36 20 267 6801"
export const TELEFON_HIVAS = "tel:+36202676801"

export const Kerdezd = () => (
  <a
    href={TELEFON_HIVAS}
    className="text-sm font-semibold underline"
    style={{ color: "var(--terv-kiemel-tinta)" }}
    data-testid="vaz-kerdezd-telefon"
  >
    {TELEFON_MEGJELENITVE}
  </a>
)

/**
 * A VAZ SLOT-TERKEPE. Ami `undefined`, az uresen marad -- a `LapVaz` akkor a
 * varakozo szoveget mutatja.
 *
 * A ki nem toltott kulcsok SZANDEKOSAN hianyoznak, es a fenti fejlec mondja meg,
 * miert: nincs forrasuk. Egy ures kulcs itt tobbet mond, mint egy kitalalt ertek.
 */
/**
 * A MAR BEOLVADT RESZEK BEFOGADASA -- ES EGY ELTERES, AMIT KIMONDOK.
 *
 * Acrobot kikotese: "Ezek nem ujraepitendok: a vaznak be kell fogadnia oket."
 * A `ProductActions` HAROM mar beolvadt munkat hoz magaval:
 *
 *   #48, #51, #55   murena harom keszlet-allapota, az egyedi peldany jelveny,
 *                   es a magyarazo mondatok
 *   #54             a Codex mennyisegi lepteteje
 *   #58             a valtozat-valaszto merese
 *
 * AZ ELTERES, ES NEM REJTEM EL: a terv EZT HAROM KULON DOBOZRA bontja
 * (elerhetoseg, valaszto, mennyiseg), a `ProductActions` viszont egyetlen
 * komponens, ami mind a harmat tartalmazza. Ide a `mennyiseg` slotba kerul,
 * es a masik ket doboz emiatt uresnek latszik, holott a tartalmuk MEGVAN --
 * csak eggyel lejjebb.
 *
 * MIERT IGY, ES NEM SZETSZEDVE: a szetszedes a mar beolvadt komponens
 * ATIRASA lenne, harom kulon darabra, es a kozottuk levo allapot (kivalasztott
 * valtozat, mennyiseg, kosarba tetel) egyutt mozog. Egy vaz-lepes ezt nem
 * vallalhatja. A szetbontas kulon kor, es akkor a HAROM doboz kulon-kulon kap
 * tartalmat.
 *
 * ES MIERT PARAMETER, NEM IMPORT: a `ProductActions` KLIENS-komponens, es a
 * lancaban server-only modul all. Ha ez a fajl importalja, a rea iranyulo
 * TESZTFAJL EL SEM INDUL -- merve: a spec module-szintu hibaval elszallt, es az
 * osszegzes MEGIS 69 zoldet irt, mert a tobbi fajl lefutott. Ugyanaz az alak,
 * mint a "nulla teszt futott le", csak fajl szinten, es meg meg is nyugtat.
 *
 * Igy a lekepezes tiszta marad: a vaz azt mondja meg, MI HOVA kerul, es aki a
 * lapot osszerakja, az adja at a komponenst.
 */
export function vazTartalom(
  termek: Termek,
  vasarlasAktiv?: boolean,
  hasonloResz?: React.ReactNode,
  fotoResz?: React.ReactNode,
  ragadosResz?: React.ReactNode,
  /**
   * A HATODIK, ES A VEGERE KERULT, NEM KOZEPRE.
   *
   * Ez a szignatura POZICIONALIS, es minden parametere elhagyhato
   * `React.ReactNode` -- vagyis egy KOZEPRE szurt uj parameter a mogotte
   * allokat CSENDBEN eltolna: a lap rendereleodne, csak mas resz kerulne mas
   * dobozba. Ugyanaz az alak, amit a `mennyiseg-opciok.ts` fejlece rogzit, ahol
   * egy pozicionalis argumentum jelentese valtozott meg eszrevetlenul.
   *
   * A vegere teve egyetlen meglevo hivas sem mozdul (ma ketto van).
   */
  kiegeszitoResz?: React.ReactNode,
  /**
   * A HETEDIK, ES UGYANAZERT A VEGERE, mint a hatodik: a szignatura
   * POZICIONALIS, tehat egy kozepre szurt parameter a mogotte allokat
   * csendben eltolna.
   *
   * ES EZ AZ ELSO, AMI NEM `React.ReactNode`, hanem ADAT. Azert kell adatnak
   * lennie, mert a `Cimsor` a lancot SZAMOLJA belole -- egy kesz node-ot a
   * hivo nem tudna eloallitani anelkul, hogy a lanc-logika ketfele allna.
   */
  kategoriak?: BesorolasKategoria[],
): Record<string, React.ReactNode> {
  const tartalom: Record<string, React.ReactNode> = {
    cimsor: <Cimsor termek={termek} kategoriak={kategoriak} />,
    /**
     * AZ EGYETLEN SLOT, AMI NEM TERMEK-ADATON ALL, tehat feltetel nelkul all a
     * helyen: a bolt telefonszama minden termeknel ugyanaz.
     */
    kerdezd: <Kerdezd />,
  }

  /**
   * A NEGY VASARLASI DOBOZ -- ES MIERT EGYETLEN LOGIKAI ERTEK NYITJA MIND A NEGYET.
   *
   * A tobbi slot ONALLO node-ot kap, mert onallo is: a galeria, a hasonlo lista
   * es a ragados sav kulon-kulon ertelmes. A negy vasarlasi doboz NEM ilyen:
   * UGYANAZT az allapotot olvassa mind a negy, harom irja is, tehat vagy
   * mind a negy all, vagy egyik sem. Egy negyfele parameter azt sugallna, hogy
   * kulon-kulon is atadhatok -- pedig egy fel keszlet nem allapot, hanem hiba.
   *
   * AMIT EZ AZ ERTEK TENYLEG ALLIT: a hivo korulvette a lapot a
   * `VasarlasProvider`-rel. Ha nem tette, a negy doboz `null`-t adna, es a vaz
   * TELINEK jelolt, de URES dobozokat rajzolna -- rosszabb, mint a varakozas.
   * Ezert dont ez a sor, es nem a dobozok sajat ures-aga.
   */
  const egyediPeldany = uniquePieceOf(termek.metadata)
  /*
   * A KISZERELES FELIRATA IDE KERULT ELORE, mert 2026-09-10 ota KET helyen
   * kell: az egyedi peldany lapjan a Brutto ar sor melle, minden mas lapon a
   * mennyiseg-lepegeto koré. Mindketto a `vasarlasAktiv` agban all, ami
   * korabban fut, mint ahol ez a sor eddig allt.
   */
  const egyseg = egysegFelirat(termek)

  /**
   * A DOA-SOR CSAK AZ ELO ALLAT LAPJAN ALL, ES EZ NEM STILUS-DONTES.
   *
   * A tervlapon a sor a 2a (elo allat) szakaszban all, es CSAK ott: az 1b
   * (muszaki) lapon nincs. Ez a domenbol is kovetkezik -- "dead on arrival"
   * egy szallitott ELO allatra ertelmezheto, egy lampara nem.
   *
   * === AMIT EZ A FELTETEL ALLIT, ES AMIT NEM ===
   *
   * A `vilagaTermeknek` azt mondja meg, hogy a termek elo allat-e. AMIT NEM
   * mond meg: hogy a garancia MINDEN elo allatra szol-e, vagy csak az egyedi
   * peldanyokra. A tervlap erre nem valaszol, mert a rajta allo termek
   * VELETLENUL mind a ketto (WYSIWYG korall).
   *
   * A tagabb alakot valasztottam (minden elo allat), mert a DOA fogalma a
   * szallitasrol szol, nem a peldany egyedisegerol. Ez FELTEVES, nem meres --
   * ha szukebb kell, egy `uniquePieceOf` hivas a helye, es akkor ez a
   * bekezdes valtozik.
   *
   * === ES A HATOKOR JOVAHAGYASRA VAR (acrobot, 2026-09-09 19:13) ===
   *
   * A fenti felteves NEM az en dontesem lezarasa, hanem egy ideiglenes alak.
   * A sor szovege PENZUGYI IGERET a vevo fele ("a teljes vetelarat
   * visszateritjuk"), nem elrendezes -- tehat sem a SZOVEGET, sem a HATOKORT
   * (mely termekekre all) nem hagyhatjuk jova magunk kozott.
   *
   * A kartya: `61f9b067`. Amig azon nincs Balazs jovahagyasa:
   *
   *   a teszt bolton      LATSZHAT
   *   eles boltba         NEM MEHET KI
   *
   * Ez a bekezdes azert all itt es nem csak a kartyan, mert aki a lapot
   * elesbe viszi, a KODOT olvassa, nem a tablat. Ha a jovahagyas megjon, ez a
   * szakasz torolheto -- de a torles akkor a jovahagyas TENYET rogzitse,
   * ne csak tunjon el.
   */
  const eloAllat = vilagaTermeknek(termek, kategoriak) === "sotet"

  if (vasarlasAktiv) {
    /*
     * AZ AR ALATTI KIS SOR AZ AR-REKESZBEN AL, NEM SAJAT SZAKASZBAN.
     *
     * A tervben kozvetlenul az ar alatt fut, ugyanabban a dobozban -- es a vaz
     * szakaszai a terv DOBOZAIT kovetik, nem a sorait. Egy sajat szakasz azt
     * allitana, hogy ez onallo doboz, es a vaz uresen jelolne minden olyan
     * lapon, ahol az ar sincs (a mobil peldanyban a jobb halom ures).
     */
    tartalom.ar = (
      <>
        <ArDoboz />
        <ArAlattiSor
          cikkszam={cikkszam(termek)}
          egyediPeldany={egyediPeldany}
        />
        {egyediPeldany && <KiszerelesSor kiszereles={egyseg} />}
      </>
    )
    tartalom.mennyiseg = (
      <>
        {!egyediPeldany && <KiszerelesSor kiszereles={egyseg} />}
        <MennyisegDoboz />
        {eloAllat && <DoaGarancia />}
      </>
    )

    /**
     * A VALASZTO DOBOZ HELYE ADATBOL DOL EL, NEM A DOBOZ URES AGABOL.
     *
     * A doboz maga is `null`-t ad egyedi peldanynal es opcio nelkul -- de ha
     * CSAK az dontene, a vaz TELINEK jelolne egy uresen rajzolo dobozt. A
     * kulonbseg latszik: egy telinek jelolt ures doboz nem varakozik, hanem
     * hianyzik.
     *
     * A ket feltetel indoka a `product-actions/index.tsx` fejleceben all
     * teljes hosszan (harom allapot, plusz az egyedi peldany negyedik esete).
     */
    /*
     * A HARMADIK FELTETEL 2026-09-10 OTA: legyen MIBOL valasztani. A kozos
     * predikatum (`vanValaszthatoOpcio`) ugyanaz, amit a doboz sajat orzoje
     * hiv -- egy szabaly, egy helyen.
     */
    if (!egyediPeldany && vanValaszthatoOpcio(termek)) {
      tartalom.valaszto = <ValasztoDoboz />
    }
  }

  /**
   * A FOTO SLOT: ATADHATO, ES A MURENA LAPJAN ATADANDO.
   *
   * A vaz sajat `Foto` komponense EGY kepet rendereli, es semmit nem tud arrol,
   * mi TAPAD a kephez. Az elo allat lapjan viszont ket dolog tapad hozza, es
   * egyik sincs a `ProductActions`-ben:
   *
   *   UniquePieceBadge     az ELSO kepre, a galeria kontenereben (abszolut)
   *   UniquePiecePromise   a galeria ALATT
   *
   * Ha az a lap atallna a vazra ugy, hogy a `Foto` marad, mind a ketto
   * ELTUNNE -- pontosan az a regresszio, ami a fulekkel ma mar egyszer
   * megtortent (a vaz megkerulte a `product-info`-t, es a #50 munkaja holt kod
   * lett a muszaki lapokon).
   *
   * Ezert ugyanaz a szerzodes, mint a vasarlasi resznel es a hasonlo listanal:
   * ha a hivo ATAD tartalmat, azt tesszuk a helyere; ha nem, a vaz sajat
   * egykepes valtozata all ott. A vaznak nincs forrasa eldonteni, mi tapad a
   * kephez -- a lapot ossserako oldal tudja.
   *
   * (murena kerese, 2026-09-07, msg_id 14373; az erve az oveé, es helyes.)
   */
  if (fotoResz) {
    tartalom.foto = fotoResz
  } else if (termek.thumbnail || termek.images?.[0]?.url) {
    tartalom.foto = <Foto termek={termek} />
  }

  /**
   * A FULEK A MAR MEGLEVO KOMPONENSBOL JONNEK, NEM SAJAT LEIRAS-BLOKKBOL.
   *
   * A #50 (a kulso Codex fejleszto munkaja) mar megepitette a fuleket: a
   * leirasbol kiemeli a HTML tablazatokat, es "Leiras" plusz "Muszaki adatok"
   * fulre bontja. Ha a vaz a SAJAT blokkjat tenne ide, az a mar beolvadt munka
   * CSENDBEN kiesne pontosan azokrol a lapokrol, amikre keszult.
   *
   * ES EZ MEGTORTENT VOLNA: a vaz megkeruli a `product-info` fajlt, ahol a fulek
   * allnak. Murena komponenseit megneztem, a fuleket nem -- murena szolt.
   *
   * A tisztitas a MI oldalunkon marad: a ful-komponens sajat kommentje mondja
   * ki, hogy mar megtisztitott sztringet var, es nem ertelmezi a tartalmat.
   */
  const tisztaLeiras = sanitizeDescription(termek.description)
  if (tisztaLeiras) {
    tartalom.fulek = <ProductDescriptionTabs description={tisztaLeiras} />
  }

  /**
   * A 7. DOBOZ KET TENYT HORD, ES MINDKETTO MAR MEGVOLT -- csak az egyik rossz
   * helyen allt. A kiszereles eddig is itt volt; a minimalis rendelesi
   * mennyiseg a GOMB ALATT, a 9. dobozban. Mindketto keszlet-teny, tehat a
   * terv szerinti dobozba valo.
   *
   * A doboz `null`-t ad, ha egyik sincs -- ilyenkor a vaz varakozo szoveget
   * mutat, ami a helyes valasz: szallitas es bolti atvetel adatkent MA NINCS.
   */
  /**
   * EGYEDI PELDANYNAL NINCS RENDELESI SZABALY: abbol egy darab van, tehat sem
   * a minimum, sem a lepeskoz, sem a maximum nem mond semmit. Ez a korabbi
   * `egyediPeldany ? 1 : ...` alak kiterjesztese mind a harom parameterre.
   */
  const rendelesiMondat = egyediPeldany
    ? null
    : orderQuantityHint({
        minimum: minimumOrderQuantity(termek),
        step: orderQuantityStep(termek),
        orderMaximum: maximumOrderQuantity(termek),
      })
  /**
   * A SZUKOSSEG-SOR A BOLT BEALLITASABOL JON, nem a WYSIWYG jelzobol -- a
   * dontes es az indoka a `scarcityCountOf` fejlecben all.
   *
   * Az ELSO valtozatot nezzuk: a teszt bolt mind az 1492 termeke pontosan egy
   * valtozatu (merve 2026-09-08), tehat ma nincs mit valasztani kozottuk. Ha
   * ez valaha megvaltozik, a kivalasztott valtozat kell ide -- de az a
   * vasarlasi kontextusban all, nem itt.
   */
  const keszlet = scarcityCountOf(termek.variants?.[0])
  /*
   * A KISZERELES MAR NEM SZAMIT BELE A FELTETELBE, es ez a valtozas MERT
   * kovetkezmenye: az `unas_unit` a katalogus 1492 termekebol 1492-n all, tehat
   * ma ez a mezo tartja "telinek" a rekeszt. Nelkule 1478 lapon URES lesz
   * (marad: minimum>1 tizennegy, lepeskoz tizenketto, maximum negy, es a
   * keszlet-sor nulla -- merve 2026-09-10 a stage boltban).
   *
   * Ez SZANDEKOS: egy ures rekesz a 2026-09-10-i valtozas ota nem all a vevo
   * ele (nincs keret es nem foglal helyet), tehat az uresseg nem latszik
   * hianynak.
   */
  if (rendelesiMondat || typeof keszlet === "number") {
    tartalom.elerhetoseg = (
      <ElerhetosegDoboz rendelesiMondat={rendelesiMondat} keszlet={keszlet} />
    )
  }

  /**
   * A HASONLO TERMEKEK A 13. DOBOZBA KERULNEK, ES NEM UJ KEPESSEG.
   *
   * A lista MA IS megjelenik a vazas lapon -- csak a vazon KIVUL, alatta, a
   * starter sajat angol fejlecevel. Kozben a terv 13. doboza ("Hasonlo lampak")
   * URESEN varakozik ugyanazon a lapon. Merve az elo lapon (2026-09-07):
   * `related-products-container` ott van, es `data-vaz-szakasz="hasonlo"` ures.
   *
   * Ez tehat nem szakadas (a kepesseg be VAN kotve), hanem ROSSZ HELY. Ugyanaz
   * a komponens, ugyanazzal a lekerdezessel, csak a terv szerinti dobozban.
   *
   * ES UGYANUGY PARAMETER, NEM IMPORT, mint a vasarlasi resz: a `RelatedProducts`
   * ASZINKRON szerver-komponens, ami adatot hiv le. Ha ez a fajl importalna, a
   * rea iranyulo tesztfajl ugyanugy elszallna module-szinten, ahogy a
   * `ProductActions`-nel merve lett.
   */
  /**
   * ES A DONTES AZ ADATBOL JON, NEM A BURKOLO LETEZESEBOL.
   *
   * A hivo egy BURKOLO ELEMET ad at (`<div>` a Suspense korul), es az MINDIG
   * letezik. A `VazDoboz` uressegi vizsgalata viszont a `children` letezeset
   * nezi -- nem azt, hogy a benne allo szerver-komponens vegul rajzol-e.
   *
   * A #147 ota a `RelatedProducts` gondozott kapcsolat nelkul `null`-t ad, ami
   * MA MINDEN TERMEKNEL igy van. Burkoloval egyutt a doboz TELINEK jelolt
   * (folytonos keret, hatter, cim) es URESEN rajzol -- pontosan az, amit a
   * `VazDoboz` sajat fejlece tilt: "egy ures doboz, ami kesznek latszik,
   * rosszabb a hianyzonal".
   *
   * A ket fel kulon-kulon helyes volt, es a KOZOTTUK levo allitas hianyzott:
   * ugyanaz az alak, mint amikor a vaz kapuja a `categories` mezot olvasta, es
   * a lap nem kerte le azt a mezot.
   *
   * Ezert ugyanazt a fuggvenyt kerdezzuk meg, amit a komponens is: ha nincs
   * gondozott azonosito, a slot ki sem kerul, es a doboz a varakozo szoveget
   * mutatja.
   */
  if (hasonloResz && hasonloAzonositok(termek.metadata).length > 0) {
    tartalom.hasonlo = hasonloResz
  }

  /**
   * A "AMI MEG KELLHET HOZZA" DOBOZ. UGYANAZ A SZERZODES, MASIK LISTA.
   *
   * A doboz a vazban MAR ALLT, es URESEN varakozott: az iro oldal irja a
   * `unas_accessory_ids` kulcsot, a kirakat nem olvasta. Ez a szakadas-alak --
   * mind a ket fel helyes onmagaban, es senki nem hivja.
   *
   * A FELTETEL UGYANAZ ES UGYANAZERT: a hivo egy BURKOLO elemet ad at, ami
   * mindig letezik, a `VazDoboz` uressegi vizsgalata pedig a `children`
   * letezeset nezi. Burkoloval egyutt a doboz TELINEK jelolt es URESEN
   * rajzolna -- pontosan az, amit a `VazDoboz` sajat fejlece tilt.
   *
   * ES A KET LISTA FUGGETLEN: egy termeknek lehet kiegeszitoje hasonlo nelkul
   * es forditva, tehat ez KULON feltetel, nem egy kozos ag masik fele.
   */
  if (kiegeszitoResz && kiegeszitoAzonositok(termek.metadata).length > 0) {
    tartalom.kiegeszitok = kiegeszitoResz
  }

  /**
   * A 14. DOBOZ: A LAP ALJAN FUTO SAV.
   *
   * Ugyanaz a szerzodes, mint a tobbi atadott resznel -- es itt a legerosebb az
   * indok: a sav ARAT mutat, es ha SAJAT arat szamolna, a lapon ket kulonbozo
   * ar allhatna egyszerre. A ket ar eltevedese nem hibazna, csak mast mutatna.
   */
  if (ragadosResz) {
    tartalom["ragados-sav"] = ragadosResz
  }

  return tartalom
}
