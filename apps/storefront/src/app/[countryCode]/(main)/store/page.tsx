import { Metadata } from "next"

import { storeCanonical } from "@lib/util/lap-canonical"
import { keresesSzovege } from "@lib/util/kereses"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

/*
 * A STATIKUS `metadata` HELYETT `generateMetadata`, ES CSAK EZERT: a kanonikus
 * cim tartalmazza az orszagkodot, azt pedig egy statikus objektum nem lathatja.
 *
 * A CIM ES A LEIRAS VALTOZATLAN MARAD, angolul. Az a starter szovege, es a
 * magyar bolton tenyleg furcsan all -- de a lecserelese TARTALMI dontes
 * (marketing), nem az enyem, es egy kitalalt mondat ugyanugy tovabbutazna, mint
 * a starter sajatja. Ugyanaz az indok, amiert a fooldal leirasa ma ures.
 * Kulon kartyan all.
 */
export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<StorePageSearchParams>
}): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const oldal = Number.parseInt(String(searchParams.page ?? ""), 10)

  return {
    title: "Store",
    description: "Explore all of our products.",
    alternates: {
      canonical: storeCanonical(
        params.countryCode,
        Number.isFinite(oldal) ? oldal : null,
      ),
    },
  }
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  /**
   * A KERESES SZOVEGE. Egyetlen ertek, nem tomb: ket `q` parameter eseten a
   * masodikat eldobjuk ahelyett, hogy osszefuznenk oket -- egy osszefuzott
   * kereses NEM hibazna, csak mast keresne.
   */
  q?: string | string[]
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const kereses = keresesSzovege(searchParams.q)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      kereses={kereses}
    />
  )
}
