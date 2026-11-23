import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/penztar-uzenet"
import { getAuthHeaders } from "./cookies"

/**
 * A VISSZARENDEZÉS HÍVÁSA, CACHE-ÉRVÉNYTELENÍTÉS NÉLKÜL (Next 16; barracuda 59943, #868 review). Ez a fájl SZÁNDÉKOSAN nem `"use server"`, és nem érvényteleníti a cache-t: egy hívó
 * (szerver-akció vagy route handler) saját magának választ érvénytelenítési módot. A `stripeVisszarendezes` szerver-akció (`stripe.ts`) `updateTag`-gel, a `payment-return`
 * route handler `revalidateTag(tag, { expire: 0 })`-val érvényteleníti a kosár cimkéjét: az `updateTag` route handlerben hibát dob, és a vevő a sikertelen 3-D Secure
 * visszatérés után szerverhibát kapna a fizetési lépésre irányítás helyett. Nem dob: a hiba naplóba megy, a hívó mindenképp folytatja.
 */
export async function stripeVisszarendezesHivas(cartId: string): Promise<void> {
  try {
    await sdk.client.fetch(`/store/carts/${cartId}/stripe-rejoin`, {
      method: "POST",
      headers: { ...(await getAuthHeaders()) },
    })
  } catch (hiba) {
    console.error(
      "A kosár visszarendezése nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
    )
  }
}
