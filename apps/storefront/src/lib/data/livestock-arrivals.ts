"use server"

import { sdk } from "@lib/config"
import {
  arrivingAnimalsOf,
  type ArrivingAnimal,
} from "@lib/util/livestock-arrivals"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/**
 * AZ UTON LEVO ELO ALLATOK (V2.6 S4c): a bolt listaja, sorokra szigoruan olvasva. Ha a bolt nem valaszol (a modul meg
 * nincs kint, halozati hiba), a lap ures listat kap, es ezt mondja ki, nem hibaoldalt: egy hiba itt nem 500, mert a
 * lista kiegeszito tartalom.
 */
export async function utonLevoAllatok(): Promise<ArrivingAnimal[]> {
  try {
    const body = await sdk.client.fetch<unknown>("/store/livestock-arrivals", {
      method: "GET",
      next: {
        ...(await getPublicCacheOptions("products")),
        revalidate: FRISSITES_MP,
      },
    })
    return arrivingAnimalsOf(body)
  } catch {
    return []
  }
}

/**
 * A kotott erkezesek bolti termekeinek kezelese (`handle`), a lap linkjeihez. Egy hiba nem viszi el a listat: link
 * nelkul rajzolodnak a sorok.
 */
export async function termekKezelok(
  termekIdk: readonly string[],
): Promise<Record<string, string>> {
  const idk = Array.from(new Set(termekIdk))
  if (!idk.length) return {}
  try {
    const body = await sdk.client.fetch<{
      products?: { id?: unknown; handle?: unknown }[]
    }>("/store/products", {
      method: "GET",
      query: { id: idk, fields: "id,handle", limit: idk.length },
      next: {
        ...(await getPublicCacheOptions("products")),
        revalidate: FRISSITES_MP,
      },
    })
    return Object.fromEntries(
      (body.products ?? []).flatMap((p) =>
        typeof p.id === "string" && typeof p.handle === "string"
          ? [[p.id, p.handle] as const]
          : [],
      ),
    )
  } catch {
    return {}
  }
}
