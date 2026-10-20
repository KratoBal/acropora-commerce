"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"
import { getPublicCacheOptions } from "./cookies"

const KEZDOLAP_FRISSITES_MP = 300

/**
 * A KEZDOLAP SZERKESZTHETO TARTALMA (`GET /store/homepage-content`).
 *
 * `null`, ha az OS meg nem irt tartalmat, VAGY ha a bolt ezt a vegpontot meg
 * nem ismeri (404: a storefront a backend elott telepult). Mindket esetben a
 * lap a terv kezdoertekeit mutatja. Minden MAS hiba tovabbmegy (ugyanaz az
 * indok, mint a markaoldalnal): egy atmeneti Medusa-hiba ne cserelje le a
 * szerkesztett szovegeket a kezdoertekekre, amit az ISR aztan a revalidate
 * idejeig tarolna.
 *
 * A cimke (`homepage-content`) az `/api/revalidate` utjan uritheto: az OS
 * mentesekor a backend ezt hivja.
 */
export async function kezdolapTartalom(): Promise<KezdolapTartalom | null> {
  try {
    const { homepage_content } = await sdk.client.fetch<{
      homepage_content: KezdolapTartalom | null
    }>("/store/homepage-content", {
      method: "GET",
      next: {
        ...(await getPublicCacheOptions("homepage-content")),
        revalidate: KEZDOLAP_FRISSITES_MP,
      },
    })
    return homepage_content ?? null
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
  }
}
