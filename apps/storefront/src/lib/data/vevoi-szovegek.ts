"use server"

import { sdk } from "@lib/config"
import type { Overrides } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { getPublicCacheOptions } from "./cookies"

const VEVOI_SZOVEG_FRISSITES_MP = 300

/**
 * AZ OS-BEN ÁTÍRT VEVŐI SZÖVEGEK EGY NYELVEN (`GET /store/customer-texts`, kártya 7bfca4eb): `{ kulcs: szöveg }`, csak a
 * felülírások. Üres, ha senki nem írt át semmit, és üres akkor is, ha a bolt ezt a végpontot még nem ismeri (404: a kirakat a
 * backend előtt települt): mindkét esetben a szótár szövege látszik.
 *
 * MINDEN MÁS HIBA IS ÜRESET AD, naplózva, és ez szándékosan más, mint a kezdőlapnál: ezt minden lap kéri (a keret és a pénztár),
 * tehát egy hiba itt nem egy blokkot, hanem a teljes kirakatot és a pénztárat állítaná meg. A hibás lekérés nem kerül a
 * gyorsítótárba, a következő kérés újra próbálja; az ára, hogy egy statikus lap a revalidate idejéig a szótár szövegét mutathatja.
 *
 * A címke (`customer-texts`) az `/api/revalidate` útján üríthető: az OS mentésekor a backend ezt hívja.
 */
export async function vevoiSzovegek(locale: Locale): Promise<Overrides> {
  try {
    const { customer_texts } = await sdk.client.fetch<{
      customer_texts: Record<string, string> | null
    }>("/store/customer-texts", {
      method: "GET",
      query: { locale },
      next: {
        ...(await getPublicCacheOptions("customer-texts")),
        revalidate: VEVOI_SZOVEG_FRISSITES_MP,
      },
    })
    return customer_texts ?? {}
  } catch (hiba) {
    if (hibaAllapota(hiba) !== 404)
      console.error("vevoi szovegek: a lekeres nem sikerult", hiba)
    return {}
  }
}
