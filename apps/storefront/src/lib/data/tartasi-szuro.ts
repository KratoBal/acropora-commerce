"use server"

import { sdk } from "@lib/config"
import {
  valaszAlak,
  type TartasiSzuro,
  type TartasiSzuroValasz,
} from "@lib/util/tartasi-szuro"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 60

/**
 * AZ ELO ALLAT KATEGORIA TARTASI SZUROJE (V2.2 S5): a bolt szamolja a `metadata.husbandry` kulcsbol
 * (`GET /store/husbandry-filter`). Ha a bolt nem valaszol, vagy a valasz alakja nem ismert, null: a lap ilyenkor
 * tartasi szuro nelkul all (kiegeszito szuro, egy hiba itt nem 500, es nem is szur rosszul).
 */
export async function tartasiSzuroValasz(
  categoryId: string,
  szuro: TartasiSzuro,
): Promise<TartasiSzuroValasz | null> {
  const params = new URLSearchParams({ category_id: categoryId })
  for (const n of szuro.nehezseg) params.append("difficulty", n)
  if (szuro.korallos) params.set("reef_safe", "1")
  for (const m of szuro.medence) params.append("tank", m)
  try {
    const body = await sdk.client.fetch<unknown>(
      `/store/husbandry-filter?${params}`,
      {
        method: "GET",
        next: {
          ...(await getPublicCacheOptions("products")),
          revalidate: FRISSITES_MP,
        },
      },
    )
    return valaszAlak(body)
  } catch {
    return null
  }
}
