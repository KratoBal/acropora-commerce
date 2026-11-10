"use server"

import { sdk } from "@lib/config"
import { listProducts } from "@lib/data/products"
import { erkezoAllatokOf, type ErkezoAllat } from "@lib/util/erkezo-allatok"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { getPublicCacheOptions } from "./cookies"

const FRISSITES_MP = 300

/**
 * AZ ERKEZO ALLATOK (V2.6 S4c): a bolt listaja (`GET /store/livestock-arrivals`), es a kotott soroknal a termek handle-je (a
 * lap a termeklapra linkel; a bolt az azonositot adja, a handle-t a meglevo termeklista-lekeres). Ures lista, ha a bolt ezt a
 * vegpontot meg nem ismeri (404: a kirakat a backend elott telepult); minden mas hiba tovabbmegy, hogy az ISR egy atmeneti
 * hibat ne taroljon ures listakent.
 */
export async function erkezoAllatok(countryCode: string): Promise<{
  sorok: ErkezoAllat[]
  handleOf: Record<string, string>
}> {
  let valasz: unknown
  try {
    valasz = await sdk.client.fetch<unknown>("/store/livestock-arrivals", {
      method: "GET",
      next: {
        ...(await getPublicCacheOptions("livestock-arrivals")),
        revalidate: FRISSITES_MP,
      },
    })
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return { sorok: [], handleOf: {} }
    throw hiba
  }
  const sorok = erkezoAllatokOf(valasz)
  const kotott = Array.from(
    new Set(sorok.flatMap((s) => (s.termekId ? [s.termekId] : []))),
  )
  const handleOf: Record<string, string> = {}
  if (kotott.length) {
    const { response } = await listProducts({
      countryCode,
      queryParams: {
        id: kotott,
        limit: kotott.length,
        fields: "id,handle",
      } as never,
    })
    for (const p of response.products) if (p.handle) handleOf[p.id] = p.handle
  }
  return { sorok, handleOf }
}
