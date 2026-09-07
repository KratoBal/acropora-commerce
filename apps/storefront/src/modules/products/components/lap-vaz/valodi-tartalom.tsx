import { HttpTypes } from "@medusajs/types"
import { sanitizeDescription } from "@lib/util/sanitize-description"
import ProductDescriptionTabs from "@modules/products/components/product-description-tabs"
import React from "react"

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

/** A vevonek szant, semleges mertekegyseg-felirat. */
function egysegFelirat(termek: Termek): string | null {
  const egyseg = (termek.metadata as Record<string, unknown> | null)?.unas_unit
  return typeof egyseg === "string" && egyseg.trim() ? egyseg.trim() : null
}

function cikkszam(termek: Termek): string | null {
  const v = termek.variants?.[0]
  return v?.sku && v.sku.trim() ? v.sku.trim() : null
}

/**
 * A LEGMELYEBB KATEGORIA NEVE. A tervben a cim alatt egy besorolas all; a
 * legmelyebb ut a legbeszedesebb, mert a gyoker mindenkinel ugyanaz
 * ("Termekek"). A melyseget az `mpath` pontjai adjak meg.
 */
export function legmelyebbKategoria(termek: Termek): string | null {
  const katok = termek.categories ?? []
  if (katok.length === 0) return null

  const melyseg = (k: { mpath?: string | null }) =>
    (k.mpath ?? "").split(".").length

  const legmelyebb = [...katok].sort((a, b) => melyseg(b) - melyseg(a))[0]
  const nev = legmelyebb?.name?.trim()
  return nev ? nev : null
}

/**
 * A CIMSOR TARTALMA. A nev mindig van; a besorolas es a cikkszam nem, es ha
 * nincs, nem irunk a helyukre semmit.
 */
export const Cimsor = ({ termek }: { termek: Termek }) => {
  const kategoria = legmelyebbKategoria(termek)
  const sku = cikkszam(termek)

  return (
    <div className="flex flex-col gap-1">
      {kategoria && (
        <p
          className="text-xs uppercase tracking-wide"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          {kategoria}
        </p>
      )}
      <h1 className="text-2xl font-semibold" data-testid="vaz-termek-nev">
        {termek.title}
      </h1>
      {sku && (
        <p
          className="text-xs"
          style={{
            color: "var(--terv-szoveg-halvany)",
            fontFamily: "var(--terv-betu-mono-lanc)",
          }}
          data-testid="vaz-cikkszam"
        >
          {sku}
        </p>
      )}
    </div>
  )
}

/**
 * A FOTO. A tervben 16:10 arany all; a kirakat `unoptimized` modban dolgozik,
 * tehat sima `img` megy ki. Ha nincs kep, a doboz URES marad -- a hivo dolga,
 * hogy ilyenkor ne adjon tartalmat.
 */
export const Foto = ({ termek }: { termek: Termek }) => {
  const kep = termek.thumbnail ?? termek.images?.[0]?.url
  if (!kep) return null

  return (
    <img
      src={kep}
      alt={termek.title ?? ""}
      className="w-full"
      style={{ aspectRatio: "16 / 10", objectFit: "contain" }}
      data-testid="vaz-foto"
    />
  )
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
  vasarlasiResz?: React.ReactNode,
  hasonloResz?: React.ReactNode,
): Record<string, React.ReactNode> {
  const tartalom: Record<string, React.ReactNode> = {
    cimsor: <Cimsor termek={termek} />,
  }

  if (vasarlasiResz) {
    tartalom.mennyiseg = vasarlasiResz
  }

  const foto = <Foto termek={termek} />
  if (termek.thumbnail || termek.images?.[0]?.url) {
    tartalom.foto = foto
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

  const egyseg = egysegFelirat(termek)
  if (egyseg) {
    tartalom.elerhetoseg = (
      <p className="text-sm" data-testid="vaz-egyseg">
        Kiszerelés: {egyseg}
      </p>
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
  if (hasonloResz) {
    tartalom.hasonlo = hasonloResz
  }

  return tartalom
}
