import { notFound } from "next/navigation"

import { markaHandleAlapjan } from "@lib/data/brands"
import { getCollectionByHandle } from "@lib/data/collections"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CollectionTemplate from "@modules/collections/templates"
import { listProducts } from "@lib/data/products"
import { LAP_MERET } from "@lib/util/lap-meret"
import { csakLapszam, lapszamLetezik } from "@lib/util/lapszam"
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
  /**
   * Igaz a markaoldalaknal (`/marka/{handle}`): a handle a MARKA handle-je, a
   * gyujtemenyt a marka-modul parositasa adja meg. A regi gyujtemeny-utnal
   * (`/collections/{handle}`) a handle maga a gyujtemenye.
   */
  markaHandle = false,
) {
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const handle = decodeHandleParam(params.handle)
  /*
    A MARKAOLDAL A GYUJTEMENYT AZ OS-AZONOSITON KERESI, NEM A HANDLE-EN (merve
    2026-10-30, teszt kirakat): az `aquamedic` marka gyujtemenye `aqua-medic`
    handle-t visel, mert a gyujtemeny a slug-csere elott jott letre. A
    kapcsolat hianyaban (regi hatter, nincs parositas) marad a handle.
  */
  const gyujtemenyHandle = markaHandle
    ? ((await markaHandleAlapjan(handle))?.collection_handle ?? handle)
    : handle
  const collection = await getCollectionByHandle(gyujtemenyHandle)

  if (!collection) {
    notFound()
  }

  // a nem letezo lapszam 404 (`lapszam.ts`); a lista 18-as lapokat mutat
  const lap = csakLapszam(searchParams)
  if (lap !== null) {
    const darab = await listProducts({
      countryCode: params.countryCode,
      queryParams: { collection_id: [collection.id], limit: 1 },
    }).then(({ response }) => response.count)
    if (!lapszamLetezik(lap, darab, LAP_MERET)) notFound()
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
