"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const retrieveCollection = async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return await sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        next,
        cache: "force-cache",
      },
    )
    .then(({ collection }) => collection)
}

export const listCollections = async (
  queryParams: Record<string, string> = {},
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return await sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: queryParams,
        next,
        cache: "force-cache",
      },
    )
    .then(({ collections }) => ({ collections, count: collections.length }))
}

export const getCollectionByHandle = async (
  handle: string,
): Promise<HttpTypes.StoreCollection | null> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      /**
       * A `*products` KIMARAD -- EZ A HARMADIK UT UGYANABBOL A HIBABOL.
       *
       * A #85 a kategoria-LISTABOL vette ki (a 144 megabajtos ut), a #102 a
       * `getCategoryByHandle`-bol (a gyoker kategorian 3,96 MB). Ez a
       * harmadik, es acrobot talalta meg MIELOTT elsult volna.
       *
       * MA NEM SUL EL: nulla gyujtemeny letezik a boltban (ket fuggetlen
       * meres, 2026-09-07). De ez ATMENETI: amikor az elso gyujtemeny
       * letrejon, a mai 1492 termek nagy resze belekerul, es ugyanaz a
       * negy megabajtos ut all elo, csak masik nevvel.
       *
       * ES A HIVO: `collection.products?.length` a helyorzok szamahoz. A
       * kategoria-oldal `?? 8` alakban ir tartalekot, ez NEM -- elsore ugy
       * latszik, hogy itt a szam `undefined` lesz.
       *
       * MERVE, NEM LEVEZETVE: a `SkeletonProductGrid` SAJAT alapertelmezese
       * 8, es egy default parameter EPP `undefined` eseten sul el. Allitas
       * all ra (`skeleton-product-grid.component.spec.tsx`), tehat a szam
       * tartalek nelkul is 8 marad.
       */
      query: { handle },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => collections[0] || null)
}
