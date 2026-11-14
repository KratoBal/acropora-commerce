import { sdk } from "@lib/config"
import { hianyzoTetelekValaszbol } from "@lib/util/bolti-atvetel"

/*
  NINCS `server-only` IMPORT, szandekosan: ugyanazert, mint a `kosar-foglalas-lekerdezes.ts`
  (csak szerveroldali hivok, a spec nem mockolja a sutimodult).
*/

/**
 * `GET /store/pickup-shortage` (V2.5 B szelet): melyik kosar-tetelbol nincs keszlet az atvetel
 * helyen. Barmilyen hiba (halozat, 503, hibas alak) `null`: a hivo ilyenkor az altalanos mondatot
 * rajzolja, nem talal ki nevet.
 */
export async function boltiHianyLekerdezes(
  cartId: string,
  locationId: string,
): Promise<string[] | null> {
  try {
    const kerdes = new URLSearchParams({
      cart_id: cartId,
      location_id: locationId,
    })
    return hianyzoTetelekValaszbol(
      await sdk.client.fetch(`/store/pickup-shortage?${kerdes.toString()}`, {
        method: "GET",
        cache: "no-store",
      }),
    )
  } catch {
    return null
  }
}
