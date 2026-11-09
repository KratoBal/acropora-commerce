"use server"

import { getCartId } from "@lib/data/cookies"
import { foglalasLekerdezes } from "@lib/data/kosar-foglalas-lekerdezes"
import { masKosaraban, type FoglalasValasz } from "@lib/util/kosar-foglalas"

/**
 * A TERMEKLAP KERDESE (V2.3 S2b): masik kosarban van-e most ez az egyedi darab, es meddig. A
 * latogato SAJAT kosarat a suti adja, nem a hivo: igy a sajat foglalas nem latszik idegennek, es
 * kivulrol nem lehet mas kosarat megnevezni. A valasz ISO ido (a szerver-akcio hataran at).
 */
export async function termekFoglalas(
  variantId: string,
): Promise<{ until: string } | null> {
  if (typeof variantId !== "string" || !variantId) return null
  const valasz = await foglalasLekerdezes([variantId], await getCartId())
  const mas = masKosaraban(valasz, variantId)
  return mas ? { until: mas.until.toISOString() } : null
}

/** A KOSAR KERDESE: a kosar tetelei kozul az egyedi darabok sajat foglalasa (a sor a kosar lapjan). */
export async function kosarFoglalasai(
  variantIds: string[],
): Promise<FoglalasValasz | null> {
  const cartId = await getCartId()
  if (!cartId || !Array.isArray(variantIds)) return null
  return foglalasLekerdezes(
    variantIds.filter((id): id is string => typeof id === "string"),
    cartId,
  )
}
