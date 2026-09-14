"use server"

import { sdk } from "@lib/config"

/**
 * A KERESES TALALATAI, AZONOSITOKKENT.
 *
 * === MIERT NEM A MEDUSA `q` PARAMETERET HASZNALJUK ===
 *
 * A mag a `q`-bol `oszlop ILIKE '%token%'` feltetelt epit, a Postgres ILIKE
 * pedig az EKEZETET nem vonja ossze. Merve a kiszolgalt lapon (2026-09-14):
 * `lehabzó` 61-72 talalat, `lehabzo` NULLA. A magyar vevo tulnyomo tobbsege
 * ekezet nelkul gepel.
 *
 * A KIRAKATBAN EZ NEM JAVITHATO: az adat ekezetes, es ha a KERDESROL szednenk
 * le az ekezetet, az ekezetes keresesek vesznenek el. A ket oldalt egy alakra
 * kell hozni, es a tarolt oldalhoz SQL kell -- ezert all a hattéroldalon egy
 * sajat vegpont (`/store/termek-kereses`), ami CSAK azonositokat ad vissza.
 *
 * A TERMEKEKET A MAI UTON kerjuk le, `id` szurovel: igy a lapozas, a szures es
 * az arazas EGY helyen marad.
 *
 * === AMIT A HIVONAK TUDNIA KELL ===
 *
 * URES LISTA VALODI VALASZ, es NEM szabad `id` szuro NELKUL tovabbmenni: egy
 * ures `id` halmazt a lekerdezes figyelmen kivul hagyhat, es akkor a vevo a
 * TELJES katalogust latna egy olyan keresesre, aminek nulla talalata van.
 * Ez a nema fajta: hihető valasz, rossz tartalommal.
 */
export type KeresesTalalat = {
  ids: string[]
  count: number
  /** Igaz, ha a lista a felso hatarnal el lett vagva. */
  csonkolt: boolean
}

export async function keresesTalalatok(
  kifejezes: string,
): Promise<KeresesTalalat> {
  const tiszta = kifejezes.trim()
  if (!tiszta) return { ids: [], count: 0, csonkolt: false }

  try {
    return await sdk.client.fetch<KeresesTalalat>("/store/termek-kereses", {
      method: "GET",
      query: { q: tiszta },
      cache: "no-store",
    })
  } catch (hiba) {
    /*
      A HIBA NEM VEZETHET A TELJES KATALOGUSHOZ. Ha a vegpont elerhetetlen, a
      helyes valasz a NULLA talalat es a "nincs talalat" mondat -- nem az, hogy
      a vevo a keresese helyett mindent lat. A valodi ok a naploban marad.
    */
    console.error("A termek-kereses vegpont nem valaszolt:", hiba)
    return { ids: [], count: 0, csonkolt: false }
  }
}
