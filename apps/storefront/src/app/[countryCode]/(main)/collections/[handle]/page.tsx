import { Metadata } from "next"
import { STORE_NAME } from "@lib/store"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { decodeHandleParam } from "@lib/util/decode-handle-param"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export const PRODUCT_LIMIT = 12

/**
 * A build ideje alatt a Medusa API-t hivja. Ha az epp nem valaszol, a build
 * NEM allhat meg: a lapok akkor is mukodnek, csak nem eloregyartva -- a Next
 * keresre rendereli oket.
 *
 * A termeklap utja ezt MAR igy csinalja (`products/[handle]/page.tsx`), ez a
 * ket ut viszont kimaradt belole, es emiatt egy stage-kimaradas MINDEN pull
 * requestet pirosra vitt. Merve 2026-09-07 15:43-kor: `Error: Service
 * Unavailable, status: 503`, `Failed to collect page data for
 * /[countryCode]/collections/[handle]` -- a forditas addigra sikeresen lefutott,
 * az API viszont percekre elment.
 */
export async function generateStaticParams() {
  try {
    const { collections } = await listCollections({
      fields: "*products",
    })

    if (!collections) {
      return []
    }

    const countryCodes = await listRegions().then(
      (regions: StoreRegion[]) =>
        regions
          ?.map((r) => r.countries?.map((c) => c.iso_2))
          .flat()
          .filter(Boolean) as string[]
    )

    const collectionHandles = collections.map(
      (collection: StoreCollection) => collection.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string) =>
        collectionHandles.map((handle: string | undefined) => ({
          countryCode,
          handle,
        }))
      )
      .flat()

    return staticParams
  } catch (error) {
    console.error(
      `Failed to generate static paths for collection pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(
    decodeHandleParam(params.handle)
  )

  if (!collection) {
    notFound()
  }

  const metadata = {
    title: `${collection.title} | ${STORE_NAME}`,
    description: `${collection.title} collection`,
  } as Metadata

  return metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(
    decodeHandleParam(params.handle)
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
