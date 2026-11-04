"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/**
 * A NEM KAPHATO (KIFUTOTT) TERMEK LAPJANAK ADATA (V4.2,
 * `GET /store/nem-kaphato/:handle`). Ket lista azonositokkal, mert ket kulon
 * allitas (acrobot 42186): a `helyette` a UNAS-ban kezzel megadott hasonlo
 * kapcsolat, a `hasonlo` gepi jelolt (ugyanaz a kategoria es marka). A
 * termekkartyakat a lap a mai uton keri le.
 */
export type NemKaphatoTermek = {
  termek: {
    id: string
    title: string
    handle: string
    kategoria: { id: string; name: string; handle: string } | null
  }
  helyette: string[]
  hasonlo: string[]
}

/** `null`, ha nincs ilyen kifutott termek (a lap ilyenkor 404); minden mas hiba tovabbmegy. */
export async function nemKaphatoTermek(
  handle: string,
): Promise<NemKaphatoTermek | null> {
  try {
    return await sdk.client.fetch<NemKaphatoTermek>(
      `/store/nem-kaphato/${encodeURIComponent(handle)}`,
      {
        method: "GET",
        next: {
          ...(await getPublicCacheOptions("products")),
          revalidate: FRISSITES_MP,
        },
      },
    )
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
  }
}
