import { sdk } from "@lib/config"
import {
  foglalasValaszbol,
  type FoglalasValasz,
} from "@lib/util/kosar-foglalas"

/*
  NINCS `server-only` IMPORT, szandekosan: csak "use server" fajlok hivjak (`cart.ts`,
  `kosar-foglalas.ts`), ugyanugy, mint a `cart.ts` sem jelol, es a `cart.ts` specjei
  a sutimodult mockoljak, ezt nem.
*/

/** A bolt valaszhatara (`MAX_VARIANTS`, S2a): egy kosarnyi darab. */
const LEGTOBB = 20

/**
 * `GET /store/cart-holds` (V2.3 S2a): a darabok foglalasa, a kerdezo kosarral. Barmilyen hiba
 * (halozat, 503, hibas alak) `null`: a hivo ilyenkor nem rajzol semmit es nem korlatoz, ugyanugy,
 * ahogy a bolt sajat horgai is nyitva engednek a sajat bajukra.
 */
export async function foglalasLekerdezes(
  variantIds: readonly string[],
  cartId?: string | null,
): Promise<FoglalasValasz | null> {
  const ids = Array.from(new Set(variantIds.filter(Boolean))).slice(0, LEGTOBB)
  if (!ids.length) return null
  const kerdes = new URLSearchParams()
  for (const id of ids) kerdes.append("variant_id", id)
  if (cartId) kerdes.set("cart_id", cartId)
  try {
    return foglalasValaszbol(
      await sdk.client.fetch(`/store/cart-holds?${kerdes.toString()}`, {
        method: "GET",
        cache: "no-store",
      }),
    )
  } catch {
    return null
  }
}
