"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { type LinkOsszegzes, linkHibaUzenet } from "@lib/util/rendeles-fizetese"

/** A link osszegzese; null, ha a token nem a mienk (404). Gyorsitotar nelkul: az allapot percre valtozhat. */
export async function linkOsszegzes(
  token: string,
): Promise<LinkOsszegzes | null> {
  try {
    return await sdk.client.fetch<LinkOsszegzes>(
      `/store/order-payment/${encodeURIComponent(token)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    )
  } catch (hiba) {
    if (hibaAllapota(hiba) === 404) return null
    throw hiba
  }
}

const uzenetOf = (hiba: unknown) =>
  linkHibaUzenet(
    hibaAllapota(hiba),
    hiba instanceof Error ? hiba.message : undefined,
  )

/** A kartya megerositesehez kello titok: a hatter most kesziti a PaymentIntentet. */
export async function inditsLinkFizetest(
  token: string,
): Promise<{ ok: true; titok: string } | { ok: false; uzenet: string }> {
  try {
    const valasz = await sdk.client.fetch<{ client_secret?: string | null }>(
      `/store/order-payment/${encodeURIComponent(token)}/session`,
      { method: "POST", body: {} },
    )
    return valasz?.client_secret
      ? { ok: true, titok: valasz.client_secret }
      : { ok: false, uzenet: uzenetOf(undefined) }
  } catch (hiba) {
    console.error(
      "A linkes fizetés indítása nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
    )
    return { ok: false, uzenet: uzenetOf(hiba) }
  }
}

/** A megerosites utan: a hatter levonja, es fizetettnek jeloli a rendelest. Ujrahivhato. */
export async function fejezdBeLinkFizetest(
  token: string,
): Promise<{ ok: true } | { ok: false; uzenet: string }> {
  try {
    await sdk.client.fetch(
      `/store/order-payment/${encodeURIComponent(token)}/complete`,
      {
        method: "POST",
        body: {},
      },
    )
    return { ok: true }
  } catch (hiba) {
    console.error(
      "A linkes fizetés befejezése nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
    )
    return { ok: false, uzenet: uzenetOf(hiba) }
  }
}
