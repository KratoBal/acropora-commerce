import "server-only"

import { markaLista } from "@lib/data/brands"
import type { SavMarka } from "@modules/kezdolap/components/markak"
import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"

/**
 * A BOLT TERMEKKEL RENDELKEZO MARKAI, HA A LOGOSAVNAK KELL. Kijeloles nelkul
 * nem kerdez. Ha a bolt nem valaszol, ures kinalat jon: a sav a nevek soraval
 * all, a kezdolap nem bukik el miatta, a hiba a naploba megy (mint a sitemapnal).
 */
export async function markaKinalat(
  tartalom: KezdolapTartalom | null,
): Promise<SavMarka[]> {
  if (!tartalom?.featured_brand_handles?.length) return []
  try {
    return await markaLista()
  } catch (hiba) {
    console.warn("[kezdolap] a markalista nem jott meg:", hiba)
    return []
  }
}
