import { Metadata } from "next"
import { epitesiHibaMegnevezve } from "@lib/util/build-time-failure"
import { STORE_NAME } from "@lib/store"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { decodeHandleParams } from "@lib/util/decode-handle-param"
import { megjelenitendoNevek } from "@lib/util/kategoria-fa"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

/**
 * Ugyanaz az ok, mint a gyujtemeny-lapnal, es ugyanaz a kezeles: a bukas marad,
 * de az uzenet megmondja, hogy a bolt nem valaszol es nem a kod a hibas.
 */
export async function generateStaticParams() {
  try {
    const product_categories = await listCategories()

    if (!product_categories) {
      return []
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat(),
    )

    const categoryHandles = product_categories.map(
      (category: HttpTypes.StoreProductCategory) => category.handle,
    )

    const staticParams = countryCodes
      ?.map((countryCode: string | undefined) =>
        categoryHandles.map((handle: string) => ({
          countryCode,
          category: [handle],
        })),
      )
      .flat()

    return staticParams
  } catch (error) {
    epitesiHibaMegnevezve("kategoria", error)
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(
      decodeHandleParams(params.category),
    )

    /*
      A LAP CIME A TELJES NEVET VISELI -- ES EZ MERESEN ALL, NEM OVATOSSAGON.

      A lap LATHATO reszei (morzsamenu, H1, csempek, menu) a ROVID nevet
      mutatjak: ott UT all a nev mellett, tehat a rovid alak nem valik
      ketertelmuve -- a bal szomszed adja a szulot.

      A `<title>` az EGYETLEN hely, ahol nincs ut: a bongeszo-fulon es a
      talalati listaban a nev magaban all.

      === A MERES, A BOLT MAI ADATAN (2026-09-09) ===

          kategoria                                  219
          gyerek, akinek a neveben ott a szulo rovid neve   213 / 213
          UTKOZO rovid nev                            27
          ERINTETT LAP (azonos cimet kapna)           77

      Peldaul "Aquaforest" HET kulonbozo lap rovid neve (Koralltápok,
      Haleledelek, Aminosavak es vitaminok, ...). Rovid cimmel mind a het lap
      cime azonos lenne: `Aquaforest | Acropora`.

      A 77 NEM veletlen szam: Balazs 2026-09-04-i dontese pontosan ennyi
      UTKOZO kategoriarol szol, amelyik a szulot A NEVEBEN tartja meg. A
      dontes tehat az ADATBAN oldja fel az utkozest -- de az a betoltes MEG
      NEM FUTOTT LE, es addig a rovid cim 77 lapon utkozne.

      Ezert a cim a teljes nevet viseli. Amikor a betoltes lefut, a 142 egyedi
      kategoria neve MAR rovid lesz, tehat ez a sor MAGATOL a rovid alakot
      adja -- es a 77 utkozo megtartja a megkulonbozteto szulot. Nem kell
      visszaterni ide.
    */
    const title = `${productCategory.name} | ${STORE_NAME}`

    const description = productCategory.description ?? `${title} category.`

    return {
      title,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

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

    A mezolista szandekosan szuk (`id,name,parent_category_id`): a szabalyhoz
    ennel tobb nem kell, es egy szeles lekerdezes minden kategoria-lapon
    fizetne a tobbletet.

    MIERT NEM HAGYJUK KI: enelkul a lap feltetel nelkul vagna, a termeklap
    morzsamenuje es a fejlec-menu viszont mar nem -- vagyis UGYANAZ a kategoria
    KET kulonbozo nevvel jelenne meg ket lapon. Egy felig alkalmazott szabaly
    rosszabb, mint ha egyaltalan nem lenne.
  */
  const mindenKategoria = await listCategories({
    fields: "id,name,parent_category_id",
  })

  return (
    <CategoryTemplate
      category={productCategory}
      nevek={megjelenitendoNevek(mindenKategoria)}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
