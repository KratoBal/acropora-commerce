import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * A MARKA- (GYUJTEMENY-) LAP TORZSE, HAROM UTNAK (FE-7 3. resz). Ugyanaz a
 * felosztas, mint a kategoria-lapnal (`kategoria-lap-torzs.tsx`): az alaplap
 * es a `_p/N` ISR, a `_szurt` dinamikus, es a torzs csak azt olvassa, amit kap.
 */
export type MarkaKeres = Record<string, string | string[] | undefined> & {
  page?: string
  sortBy?: SortOptions
  optionValueIds?: string | string[]
}

export async function markaLapTorzs(
  params: { handle: string; countryCode: string },
  searchParams: MarkaKeres,
) {
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(
    decodeHandleParam(params.handle),
  ).then((collection) => collection)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
