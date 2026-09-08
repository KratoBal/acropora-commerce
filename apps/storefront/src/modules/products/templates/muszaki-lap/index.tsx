import { HttpTypes } from "@medusajs/types"
import LapVaz from "@modules/products/components/lap-vaz"
import { vazTartalom } from "@modules/products/components/lap-vaz/valodi-tartalom"
import { vilagaTermeknek } from "@modules/products/components/lap-vaz/vilag-valto"
import React from "react"

/**
 * A MUSZAKI TERMEKLAP: A VAZ BEKOTESE, ES CSAK A MUSZAKI TERMEKEKRE.
 *
 * === MIERT VAN EZ A KAPU, ES MIERT NEM A SABLONBAN ===
 *
 * A termeklap-sablon KOZOS: egyetlen fajl szolgal ki minden terméket, az elo
 * allatot es a muszakit is. Az elo allat lap MURENA kore (acrobot felosztasa,
 * 2026-09-07), es a vaz doboz-sorrendje MAS, mint a mai lape.
 *
 * Ha a vazat feltetel nelkul kotnenk be, az o lapja EGYIK PERCROL A MASIKRA
 * megvaltozna anelkul, hogy o ranezett volna. Nem veszne el semmi (a vaz
 * befogadja a harom keszlet-allapotot, a jelvenyt es a leptetot), de a
 * DONTES nem az enyem.
 *
 * Ezert all itt a kapu: a `vilagaTermeknek` mar megmondja, melyik termek elo
 * allat es melyik muszaki. Ugyanaz a jel dönti el azt is, ki kapja MAR a vazat.
 *
 * === AMIT EZ BIZONYITHATOVA TESZ ===
 *
 * Az elo allat lapja VALTOZATLAN marad, es ez nem igeret: allitas all ra. Amikor
 * murena keszen all, EGYETLEN sor cserel -- a `hasznaljaVazat` fuggveny torzse.
 */

/**
 * MA CSAK A MUSZAKI TERMEK KAPJA A VAZAT.
 *
 * Amikor az elo allat lapja is atall, ez a fuggveny `() => true` lesz, es a
 * mellette allo allitas fordul meg vele -- egy helyen, lathatoan.
 */
/**
 * AZ ATMENETI KOLTOZES-KAPCSOLO, ES MIERT NEM A VILAG-VALTOBOL OLVASSUK KI.
 *
 * A kapu ket kerdest tenne fel egyszerre, es a ketto NEM ugyanaz:
 *
 *   "elo allat-e ez a termek"     ALLANDO tulajdonsag; a vilag szinei ebbol jonnek
 *   "atallt-e mar a lapja a vazra" ATMENETI allapot, ami par nap mulva megszunik
 *
 * Ma a ketto EGYBEESIK, es epp ezert veszelyes egy sorba tenni oket: amikor a
 * koltozes kesz, a feltetel NEM azzal szunik meg, hogy megszunik az elo allat
 * fogalma -- hanem azzal, hogy nincs mit koltoztetni. Ha egy sor hordozza
 * mindkettot, valakinek ki kell talalnia, melyik felet torolje.
 *
 * Igy viszont a kapcsolo MEGMONDJA MAGAROL, hogy koltozesrol szol: murena
 * EGYETLEN ertek atirasaval kapcsolja be, es amikor mindenki a vazon van, a
 * konstans ES a feltetel EGYUTT torolheto, kerdes nelkul.
 *
 * (murena kerese, 2026-09-07, msg_id 14358; az erve az oveé.)
 */
export const ELO_ALLAT_VAZON = true

export function hasznaljaVazat(
  termek: Pick<HttpTypes.StoreProduct, "categories"> | null | undefined,
  kategoriak?: KategoriaKatalogus,
): boolean {
  if (vilagaTermeknek(termek, kategoriak) === "vilagos") return true
  return ELO_ALLAT_VAZON
}

/**
 * KI KAPJA A VALODI GALERIAT A FOTO SLOTBA.
 *
 * A #89 atadhatova tette a foto slotot, es a fejleceben MEG IS MONDTA, miert:
 * az elo allat lapjan ket dolog TAPAD a kephez, es egyik sincs a
 * `ProductActions`-ben -- a `UniquePieceBadge` az elso kepen, a
 * `UniquePiecePromise` a galeria alatt. A vaz sajat `Foto` komponense egyetlen
 * kepet rajzol, es errol a kettorol nem tud.
 *
 * A KEPESSEG MEGVOLT, A HIVAS NEM. A sablon egyik aga sem adta at a slotot,
 * tehat a vaz mindenhol a sajat egykepes valtozatat hasznalta. Ez a szakadas
 * alakja: mindket oldal helyes onmagaban, csak senki nem koti ossze -- es
 * pontosan akkor sult volna el, amikor az elo allat lapja atall, vagyis amikor
 * a jelveny elvesztese a legdragabb.
 *
 * === MIERT CSAK A SOTET VILAG, ES MIERT NEM MINDENKI ===
 *
 * A muszaki lap NEM az en korom (acrobot felosztasa, 2026-09-07). Ott a vaz
 * sajat `Foto` komponense a TERVBOL keszult, 16:10 aranyban, es ha a galeriat
 * feltetel nelkul adnam at, az o lapjanak a kepe valtozna meg anelkul, hogy
 * barki ranezett volna. Ugyanaz a hiba lenne, mint amit a kapu maga kerul el.
 *
 * Ez a feltetel tehat HATAR, nem optimalizacio, es a muszaki oldal barmikor
 * kiterjesztheti magara -- egy szo atirasaval.
 */
export function galeriatAdunkAt(
  termek: Pick<HttpTypes.StoreProduct, "categories"> | null | undefined,
  kategoriak?: KategoriaKatalogus,
): boolean {
  return vilagaTermeknek(termek, kategoriak) === "sotet"
}

/**
 * A KATALOGUS MINDHAROM HIVASNAL OPCIONALIS, ES EZ SZANDEKOS.
 *
 * Enelkul a viselkedes BETURE a mai: aki nem adja at, ugyanazt kapja, mint
 * eddig. A termeklap atadja, mert ott amugy is kez alatt van -- egy masik hivo
 * (teszt, jovobeli lista) pedig nem kenyszerul egy lekerdezesre, ami neki nem
 * kell.
 */

type KategoriaKatalogus = Array<{
  id?: string | null
  name?: string | null
  parent_category_id?: string | null
}>

type Props = {
  product: HttpTypes.StoreProduct
  /** A teljes kategoria-lista, a gyoker feloldasahoz. Lasd `vilag-valto.ts`. */
  kategoriak?: KategoriaKatalogus
  /**
   * ALL-E MAR A VASARLASI ALLAPOT A LAP FOLOTT (`VasarlasProvider`).
   *
   * Nem node, hanem logikai ertek, mert a terv NEGY dobozat ugyanaz az egy
   * allapot tolti fel -- az indoklas a `valodi-tartalom.tsx`-ben all, annal a
   * sornal, ahol a negy doboz a helyere kerul.
   */
  vasarlasAktiv?: boolean
  hasonloResz?: React.ReactNode
  fotoResz?: React.ReactNode
  ragadosResz?: React.ReactNode
}

const MuszakiLap = ({
  product,
  kategoriak,
  vasarlasAktiv,
  hasonloResz,
  fotoResz,
  ragadosResz,
}: Props) => {
  return (
    <LapVaz
      vilag={vilagaTermeknek(product, kategoriak)}
      tartalom={vazTartalom(
        product,
        vasarlasAktiv,
        hasonloResz,
        fotoResz,
        ragadosResz,
      )}
    />
  )
}

export default MuszakiLap
