"use server"

import { sdk } from "@lib/config"
import { kaphatoReefTermekek } from "@lib/util/reef-inditas"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/**
 * A "Mi a gond a medencéddel?" tunet-oldal termekei (V4.3): kezelo -> bolti cim, csak a megvehetok. Egyetlen lekeres a
 * kezelo-listara (a kaphatosag szabalya ugyanaz, mint a V4.4 oldalon es a termeklapon). Barmilyen hiba ures valasz: az oldal
 * a termekek nelkul is megall.
 */
export async function tunetTermekek(
  kezelok: readonly string[],
): Promise<Record<string, string>> {
  if (!kezelok.length) return {}
  try {
    const body = await sdk.client.fetch<{ products?: unknown[] }>(
      "/store/products",
      {
        method: "GET",
        query: {
          handle: [...kezelok],
          fields:
            "id,handle,title,*variants,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
          limit: kezelok.length,
        },
        next: {
          ...(await getPublicCacheOptions("products")),
          revalidate: FRISSITES_MP,
        },
      },
    )
    return kaphatoReefTermekek(
      (body.products ?? []) as Parameters<typeof kaphatoReefTermekek>[0],
    )
  } catch {
    return {}
  }
}
