"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/** A landing (válogatás) vevői alakja (`GET /store/landing-pages/:handle`, #541). */
export type Valogatas = {
  handle: string
  title: string
  seo_title: string | null
  meta_description: string | null
  intro: string | null
  filter: unknown
  updated_at: string | null
}

const opciok = async () => ({
  method: "GET" as const,
  next: {
    ...(await getPublicCacheOptions("landing-pages")),
    revalidate: FRISSITES_MP,
  },
})

/**
 * A válogatás rekordja. A `null` CSAK a 404 (ismeretlen vagy nem publikált);
 * minden más hiba továbbmegy, hogy egy átmeneti Medusa-hiba ne kerüljön 404-ként
 * a gyorsítótárba (a márkaoldal szabálya, #538 E).
 */
export async function valogatasHandleAlapjan(
  handle: string,
): Promise<Valogatas | null> {
  try {
    const { landing_page } = await sdk.client.fetch<{
      landing_page: Valogatas
    }>(`/store/landing-pages/${encodeURIComponent(handle)}`, await opciok())
    return landing_page ?? null
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
  }
}

/** A válogatás termékeinek azonosítói, a commerce szűrése szerint (t10). */
export async function valogatasTermekAzonositok(
  handle: string,
): Promise<string[] | null> {
  try {
    const { product_ids } = await sdk.client.fetch<{ product_ids: string[] }>(
      `/store/landing-pages/${encodeURIComponent(handle)}/product-ids`,
      await opciok(),
    )
    return product_ids ?? []
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
  }
}

/** A publikált válogatások (a sitemap listája). */
export async function valogatasLista(): Promise<Valogatas[]> {
  const { landing_pages } = await sdk.client.fetch<{
    landing_pages: Valogatas[]
  }>(`/store/landing-pages`, await opciok())
  return landing_pages ?? []
}
