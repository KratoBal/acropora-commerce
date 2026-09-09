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
import { rovidNevekLancban } from "@lib/util/kategoria-fa"

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
      A LAP CIME IS A ROVID NEVET VISELI.

      A `<title>` a kategoria NEVEBOL generalodik, tehat a rovid alakra
      valtassal MINDEN kategoria-lap cime elmozdul. Ez nem mellekhatas, hanem
      a dontes hatokore: ha a morzsamenu es a fejlec rovid nevet mutat, a lap
      cime pedig a teljeset, akkor a ket hely MASKENT nevezne ugyanazt.

      ES EGY HATAR, AMIT KI KELL MONDANI: a `<title>` az EGYETLEN hely, ahol a
      rovid nev UT NELKUL all (a bongeszo-fulon es a talalati listaban nincs
      morzsamenu folotte). Ha ket kulonbozo agon azonos rovid nev all, a ket
      lap cime azonos lesz. A 2026-09-04-i dontes szerint epp ezert kapja meg
      a 77 UTKOZO kategoria a szulot A NEVEBEN -- vagyis az adat oldjá fel, nem
      a megjelenites. Amig a betoltes nem tortent meg, ez a lehetoseg elmeleti.
    */
    const lanc: { name?: string | null }[] = []
    {
      let futo = productCategory as
        (typeof productCategory & { parent_category?: unknown }) | undefined
      while (futo) {
        lanc.unshift(futo)
        futo = (futo as { parent_category?: typeof futo }).parent_category
      }
    }
    const rovidek = rovidNevekLancban(lanc)
    const title = `${rovidek[rovidek.length - 1]} | ${STORE_NAME}`

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

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
