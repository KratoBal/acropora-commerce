import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"

/**
 * A HIRLEVEL KET LEVELBEN KULDOTT LINKJE (kettos megerosites, d707cf5f): a
 * megerosites es a leiratkozas lapja a tokent a bolthoz kuldi, keretrendszer
 * nelkul (a szerveroldali akcio hivja, a teszt kozvetlenul).
 *
 * A LAP KATTINTASRA KULD, NEM BETOLTESKOR: egy levelszkenner, ami minden linket
 * megnyit, igy nem erosit meg es nem iratkoztat le senkit.
 */
export type HirlevelLinkFajta = "megerosites" | "leiratkozas"

export type HirlevelLinkAllapot =
  | { allapot: "megerositve" | "leiratkozva" | "ervenytelen" | "lejart" }
  | { allapot: "hiba"; ok: "korlat" | "hiba" }

/** A bolt is ezt a 43 base64url karaktert fogadja el; mas alaku tokent el sem kuldunk. */
export const HIRLEVEL_TOKEN = /^[A-Za-z0-9_-]{43}$/

export const HIRLEVEL_LINK_UT: Record<HirlevelLinkFajta, string> = {
  megerosites: "/store/newsletter-subscriptions/confirm",
  leiratkozas: "/store/newsletter-subscriptions/unsubscribe",
}

const EREDMENY: Record<string, HirlevelLinkAllapot["allapot"]> = {
  confirmed: "megerositve",
  unsubscribed: "leiratkozva",
  invalid: "ervenytelen",
  expired: "lejart",
}

export async function hirlevelLink(
  token: string,
  kuld: (torzs: { token: string }) => Promise<unknown>,
): Promise<HirlevelLinkAllapot> {
  if (!HIRLEVEL_TOKEN.test(token)) return { allapot: "ervenytelen" }
  try {
    const valasz = (await kuld({ token })) as { result?: unknown } | null
    const allapot = EREDMENY[String(valasz?.result)]
    if (allapot) return { allapot } as HirlevelLinkAllapot
    console.warn("[hirlevel] ismeretlen valasz a linkre")
    return { allapot: "hiba", ok: "hiba" }
  } catch (e) {
    const kod = hibaAllapota(e)
    if (kod === 429) return { allapot: "hiba", ok: "korlat" }
    // a bolt a rossz alaku tokent 400-zal utasitja el: ugyanaz, mint egy ismeretlen
    if (kod === 400) return { allapot: "ervenytelen" }
    console.warn("[hirlevel] a link nem ment at:", kod ?? "hiba")
    return { allapot: "hiba", ok: "hiba" }
  }
}
