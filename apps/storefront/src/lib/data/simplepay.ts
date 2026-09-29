"use server"

import { sdk } from "@lib/config"
import {
  fizetesUzenet,
  hibaAllapota,
  rendelesHibaUzenet,
} from "@lib/util/penztar-uzenet"
import type { SimplePayVisszateresValasz } from "@lib/util/simplepay-eredmeny"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

/**
 * A BANKKARTYAS FIZETES A KIRAKATBOL (P4-4). A sorrend kotott (a SimplePay
 * leirasa, 8. fejezet): elfogadas, utana inditas, utana atiranyitas.
 *
 * - `valasszKartyat`: a fizetesi lepes "Tovabb" gombja. A hatter leveszi a
 *   korabbi munkamenetet es az utanvet-dijat; tranzakcio NEM indul.
 * - `inditsKartyasFizetest`: a "Rendeles leadasa" gomb, a pipa utan. Itt indul
 *   a tranzakcio (vegyes kosarnal a bontas utan), es a valasz a SimplePay
 *   fizetooldalanak cime.
 *
 * Minden ag ERTEKKEL ter vissza, nem dob: a szerver-muveletbol dobott hiba
 * uzenetet produkcioban a Next lecsereli (#371).
 */
export async function valasszKartyat(
  cartId: string,
): Promise<{ ok: true } | { ok: false; uzenet: string }> {
  try {
    await sdk.client.fetch(`/store/carts/${cartId}/simplepay-choose`, {
      method: "POST",
      headers: { ...(await getAuthHeaders()) },
    })
  } catch (hiba) {
    console.error(
      "A bankkártyás fizetés választása nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
    )
    return { ok: false, uzenet: fizetesUzenet(hibaAllapota(hiba)) }
  }

  revalidateTag(await getCacheTag("carts"))
  return { ok: true }
}

export async function inditsKartyasFizetest(
  cartId: string,
): Promise<{ ok: true; cim: string } | { ok: false; uzenet: string }> {
  try {
    const valasz = await sdk.client.fetch<{ payment_url: string | null }>(
      `/store/carts/${cartId}/simplepay-start`,
      { method: "POST", headers: { ...(await getAuthHeaders()) } },
    )

    if (!valasz?.payment_url) {
      return { ok: false, uzenet: rendelesHibaUzenet(undefined) }
    }

    return { ok: true, cim: valasz.payment_url }
  } catch (hiba) {
    console.error(
      "A bankkártyás fizetés indítása nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
      hiba instanceof Error ? hiba.message : String(hiba),
    )
    return { ok: false, uzenet: rendelesHibaUzenet(hiba) }
  } finally {
    // A kosar a hatteren valtozott (bontas, dij): a lap ne a regit mutassa.
    revalidateTag(await getCacheTag("carts"))
  }
}

/**
 * A visszateres ellenorzese a hatternel: az `r` es `s` alairasat a hatter
 * ellenorzi, es a tranzakcio lekerdezese dont. Hibanal null: a lap ilyenkor
 * azt mondja, hogy nem tudtuk ellenorizni.
 */
export async function simplePayVisszateres(
  r: string,
  s: string,
): Promise<SimplePayVisszateresValasz | null> {
  return sdk.client
    .fetch<SimplePayVisszateresValasz>(`/store/simplepay/back`, {
      method: "POST",
      body: { r, s },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .catch((hiba) => {
      console.error(
        "A SimplePay visszatérés ellenőrzése nem sikerült:",
        hibaAllapota(hiba) ?? "(nincs állapotkód)",
      )
      return null
    })
}
