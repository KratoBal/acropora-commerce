"use server"

import { sdk } from "@lib/config"
import { hibaAllapota, rendelesHibaUzenet } from "@lib/util/penztar-uzenet"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

/**
 * A VEGYES KOSÁR STRIPE-FIZETÉSE A LEADÁSKOR (Balázs 2026-10-01, 1-es út):
 * a háttér most bontja a kosarat, és most készíti a két rendelés közös
 * PaymentIntentjét (`stripe-start`); a válaszban a kártya megerősítéséhez
 * kellő titok jön.
 *
 * NINCS `revalidateTag` ITT: a kártya megerősítése még ugyanabban a
 * kezelőben jön, és egy újrarajzolt pénztár a kártyamezőt is újra csatolná.
 * A leadás (`placeOrder`) vagy a visszarendezés frissít utána.
 */
export async function inditsStripeKozosFizetest(
  cartId: string,
): Promise<{ ok: true; titok: string } | { ok: false; uzenet: string }> {
  try {
    const valasz = await sdk.client.fetch<{ client_secret?: string | null }>(
      `/store/carts/${cartId}/stripe-start`,
      { method: "POST", headers: { ...(await getAuthHeaders()) } },
    )

    if (!valasz?.client_secret) {
      return { ok: false, uzenet: rendelesHibaUzenet(undefined) }
    }

    return { ok: true, titok: valasz.client_secret }
  } catch (hiba) {
    console.error(
      "A Stripe-fizetés indítása nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
      hiba instanceof Error ? hiba.message : String(hiba),
    )
    return { ok: false, uzenet: rendelesHibaUzenet(hiba) }
  }
}

/**
 * A KÖZÖS STRIPE-FIZETÉS NEM JÖTT LÉTRE (elutasított kártya, megszakítás): a
 * sorok visszakerülnek egy kosárba, és a zárolás felszabadul
 * (`stripe-rejoin`). Utána bármelyik fizetési mód újra választható.
 */
export async function stripeVisszarendezes(cartId: string): Promise<void> {
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
  } finally {
    revalidateTag(await getCacheTag("carts"))
  }
}
