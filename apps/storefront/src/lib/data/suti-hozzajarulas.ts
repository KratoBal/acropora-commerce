"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { SUTI_HOZZAJARULAS_VERZIO } from "@lib/util/suti-hozzajarulas"

/**
 * A BEJELENTKEZETT VEVO SUTI-DONTESE A SZERVERRE IS (kartya d5515c7d). Az ido
 * a szervere; mi a verziot es a ket kategoriat kuldjuk. Kijelentkezett
 * latogatonal nem kuldunk semmit. Ha a hivas elbukik, a helyi dontes attol
 * all: a kirakat nem akad meg rajta. Az eredmeny csak a tesztnek es a
 * naplonak szol.
 */
export async function sutiDontesRogzitese(dontes: {
  statisztika: boolean
  marketing: boolean
}): Promise<"rogzitve" | "nincs-belepve" | "hiba"> {
  const fejlec = await getAuthHeaders()
  if (!("authorization" in fejlec)) return "nincs-belepve"
  try {
    await sdk.client.fetch("/store/customers/me/suti-hozzajarulas", {
      method: "POST",
      body: {
        verzio: SUTI_HOZZAJARULAS_VERZIO,
        statisztika: dontes.statisztika === true,
        marketing: dontes.marketing === true,
      },
      headers: fejlec,
      cache: "no-store",
    })
    return "rogzitve"
  } catch {
    return "hiba"
  }
}
