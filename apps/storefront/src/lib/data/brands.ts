"use server"

import { sdk } from "@lib/config"
import { getPublicCacheOptions } from "./cookies"

const MARKA_FRISSITES_MP = 300

/** A marka-modul vevoi alakja (`GET /store/brands/:handle`, SEO P0 PR 11). */
export type Marka = {
  name: string
  handle: string
  description: string | null
  intro: string | null
  seo_title: string | null
  meta_description: string | null
  logo_url: string | null
  website_url: string | null
  updated_at: string | null
}

/**
 * A markaoldal rekordja. A `null` azt jelenti, hogy a marka-modulban nincs
 * ilyen handle (404), vagy a vegpont nem valaszolt: a lap mindket esetben
 * nem talalhato, mert enelkul nincs mibol cimet es canonicalt adni.
 */
export async function markaHandleAlapjan(
  handle: string,
): Promise<Marka | null> {
  try {
    const { brand } = await sdk.client.fetch<{ brand: Marka }>(
      `/store/brands/${encodeURIComponent(handle)}`,
      {
        method: "GET",
        next: {
          ...(await getPublicCacheOptions("brands")),
          revalidate: MARKA_FRISSITES_MP,
        },
      },
    )
    return brand ?? null
  } catch {
    return null
  }
}

/** A termekkel rendelkezo markak (a sitemap listaja). */
export async function markaLista(): Promise<Marka[]> {
  const { brands } = await sdk.client.fetch<{ brands: Marka[] }>(
    `/store/brands`,
    {
      method: "GET",
      next: {
        ...(await getPublicCacheOptions("brands")),
        revalidate: MARKA_FRISSITES_MP,
      },
    },
  )
  return brands ?? []
}
