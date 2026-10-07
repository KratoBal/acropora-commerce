import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { decodeHandleParams } from "@lib/util/decode-handle-param"
import {
  kategoriaFelmenoi,
  megjelenitendoNevek,
  teljesLanc,
} from "@lib/util/kategoria-fa"
import { markaAzonositok } from "@lib/util/marka-szuro"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CategoryTemplate from "@modules/categories/templates"
import { categoryPageKind } from "@modules/categories/templates/category-page-data"
import { LAP_MERET as COMMERCE_LAP_MERET } from "@modules/categories/templates/commerce/kategoria-lap"
import { listProducts } from "@lib/data/products"
import { csakLapszam, lapszamLetezik } from "@lib/util/lapszam"
import { lapozoKeres } from "@modules/store/components/pagination/lap-href"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * A KATEGORIA-LAP TORZSE, HAROM UTNAK (FE-7 3. resz).
 *
 * Eddig a `page.tsx` `searchParams`-bol olvasott, es ettol a lap dinamikus
 * volt (`private, no-store`). Most harom ut hivja ugyanezt, es a parametert
 * mindegyik maskepp adja (`belso-utvonalak.js`):
 *
 *   /categories/a             ures keres        ISR
 *   /_p/N/categories/a        { page: N }       ISR (a `?page=N` atirasa)
 *   /_szurt/categories/a      a teljes query    dinamikus (rendezes, szurok)
 *
 * A torzs maga semmit nem olvas a kerestol, csak amit kap.
 */
export type KategoriaKeres = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  marka?: string | string[]
}

export async function kategoriaLapTorzs(
  params: { category: string[]; countryCode: string },
  searchParams: KategoriaKeres,
) {
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const markak = markaAzonositok(searchParams.marka)

  const productCategory = await getCategoryByHandle(
    decodeHandleParams(params.category),
  )

  if (!productCategory) {
    notFound()
  }

  /*
    A TELJES KATEGORIA-LISTA A NEVEK MIATT KELL, ES EZ EGY UJ LEKERDEZES.

    A lap eddig CSAK a sajat kategoriajat kerte le (a felmenoivel es a
    gyerekeivel). A roviditesrol viszont nem lehet a lancbol dontenni: az, hogy
    egy rovid nev EGYEDI-e, a teljes katalogus tulajdonsaga.

    A mezolista szandekosan szuk (`id,name,handle,parent_category_id`): a
    nevekhez es a felmeno-lanchoz ennel tobb nem kell, es egy szeles lekerdezes
    minden kategoria-lapon fizetne a tobbletet. A `handle` a lanc linkjeihez
    kell (2026-09-29).

    MIERT NEM HAGYJUK KI: enelkul a lap feltetel nelkul vagna, a termeklap
    morzsamenuje es a fejlec-menu viszont mar nem -- vagyis UGYANAZ a kategoria
    KET kulonbozo nevvel jelenne meg ket lapon. Egy felig alkalmazott szabaly
    rosszabb, mint ha egyaltalan nem lenne.
  */
  const mindenKategoria = await listCategories({
    fields: "id,name,handle,parent_category_id",
  })
  const lanc = teljesLanc(
    productCategory,
    kategoriaFelmenoi(productCategory.id, mindenKategoria),
  )

  /*
    A NEM LETEZO LAPSZAM 404 (`lapszam.ts`). A darabszam ugyanazzal a
    kategoria-szurovel jon, mint a listae; a lapmeret a sablon agaé (a muszaki
    lap 18-at mutat, az elo allate 12-t).
  */
  const lap = csakLapszam(searchParams)
  if (lap !== null) {
    const darab = await listProducts({
      countryCode: params.countryCode,
      queryParams: { category_id: [productCategory.id], limit: 1 },
    }).then(({ response }) => response.count)
    const meret =
      categoryPageKind(lanc) === "technical" ? COMMERCE_LAP_MERET : 12
    if (!lapszamLetezik(lap, darab, meret)) notFound()
  }

  return (
    <CategoryTemplate
      /*
        A TELJES FELMENO-LANC a listabol: a bolt API csak egy szulo-szintet ad
        (`kategoriaFelmenoi`). Enelkul a morzsamenu csonka, es egy mely korall
        kategoria Commerce lapot kap.
      */
      category={lanc}
      nevek={megjelenitendoNevek(mindenKategoria)}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      markak={markak}
      lapozoKeres={lapozoKeres(searchParams)}
    />
  )
}
