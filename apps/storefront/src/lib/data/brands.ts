"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
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
 * A markaoldal rekordja. A `null` CSAK azt jelenti, hogy a marka-modulban nincs
 * ilyen handle (404). Minden mas hiba tovabbmegy (barracuda review, #538 E):
 * egy atmeneti Medusa-hiba ne adjon 404-et egy elo markaoldalra, amit az ISR
 * aztan a revalidate idejeig tarolna. Dobott hibanal a Next a regi lapot
 * szolgalja ki, vagy 500-at ad.
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
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
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

/**
 * A TERMEK MARKAJA A MARKA-MODULBOL (audit S4). A Merchant feed `brand` mezoje
 * is ebbol a modulbol jon (`brandNames` a hatterben); a terméklap JSON-LD-je
 * eddig a gyujtemeny cimet olvasta. Egy teny, egy olvasas: a lap ugyanazt a
 * hatter-vegpontot kerdezi, amit a feed a sajat fuggvenyen at.
 *
 * `null`: a terméknek nincs markaja a modulban, VAGY a vegpont nem valaszolt.
 * A hiba nem tori el a lapot (a marka a JSON-LD kiegeszitese), a lap ilyenkor
 * a gyujtemeny cimere esik vissza, mint a feed (`markaNev`).
 */
export async function termekMarka(productId: string): Promise<string | null> {
  try {
    const { product_brand } = await sdk.client.fetch<{
      product_brand: { name: string | null }
    }>(`/store/product-brands/${encodeURIComponent(productId)}`, {
      method: "GET",
      next: {
        ...(await getPublicCacheOptions("brands")),
        revalidate: MARKA_FRISSITES_MP,
      },
    })
    return product_brand?.name ?? null
  } catch (hiba) {
    console.error("A termek-marka vegpont nem valaszolt:", hiba)
    return null
  }
}
