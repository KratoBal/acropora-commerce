"use server"

import { sdk } from "@lib/config"
import { kaphatoReefTermekek, reefKezelok } from "@lib/util/reef-inditas"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/**
 * A "Inditsd el a korallos akvariumodat" oldal termekei (V4.4): kezelo -> bolti cim, csak a megvehetok. Egyetlen lekeres a
 * kezelo-listara. Barmilyen hiba (halozat, hibas alak) ures valasz: az oldal a termekek nelkul is megall.
 */
export async function reefTermekek(): Promise<Record<string, string>> {
  const kezelok = reefKezelok()
  try {
    const body = await sdk.client.fetch<{ products?: unknown[] }>(
      "/store/products",
      {
        method: "GET",
        query: {
          handle: kezelok,
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
