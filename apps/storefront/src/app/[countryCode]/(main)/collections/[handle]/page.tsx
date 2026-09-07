import { Metadata } from "next"
import { epitesiHibaMegnevezve } from "@lib/util/build-time-failure"
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
 * A build ideje alatt a Medusa API-t hivja, tehat a kapu a bolt
 * elerhetetlensegetol is pirosra valt. Merve 2026-09-07 15:43-kor: a stage
 * nehany percre elment egy lemez-takaritas alatt, es a build a lap-adatok
 * begyujtesenel hasalt el -- a forditas addigra sikeresen lefutott.
 *
 * EGY KORRAL KORABBAN URES LISTAT ADTAM VISSZA ilyenkor, hogy a build atmenjen.
 * ACROBOT DONTESE (2026-09-07 16:37) ez ellen szolt, es az erve erosebb: az
 * ures lista a VALODI hibat is elnyelne, es a nemasag a rosszabb.
 *
 * A MOSTANI ALAK: a bukas MARAD, de a hibauzenet megmondja, hogy nem a kod a
 * hibas es mit kell megnezni. A reszletek, a HAROMSZORI kiesesig szolo
 * feltetellel egyutt, a `lib/util/build-time-failure` fejleceben allnak.
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
    epitesiHibaMegnevezve("gyujtemeny", error)
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
