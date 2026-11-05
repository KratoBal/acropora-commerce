import {
  sebessegKorlat,
  type SebessegKorlat,
} from "@lib/util/hirlevel-feliratkozas"

/**
 * A VENDEG-RENDELESLAP LATOGATONKENTI KORLATJA (barracuda 42061/42076, kartya 2a7acb3b).
 *
 * MIERT A KIRAKAT SZAMOLJA: a keresest es a szamla-kerest szerveroldali akcio kuldi a bolthoz, ezert a bolt minden kerest a
 * kirakat szerverenek cimerol lat, es egy IP-kulcs a bolt middleware-eben minden vevot egy kulcsba tenne (mindenkit
 * kizarna). A bolt a PARBAN szamol (cimenkent es rendelesszamonkent: ez vedi a kitalalast), a kirakat pedig LATOGATONKENT: ez
 * szabja meg, mennyit tud egyetlen latogato a bolt rendelesszamonkenti es cimenkenti keretebol elhasznalni (a keret
 * kimeritese mas vevo kizarasat okozhatja), es mennyi cimet tud vegigprobalni.
 *
 * A LATOGATO CIME a Traefik `x-real-ip` fejlece (a hirlevel mintaja): azt a proxy irja felul, a latogato nem allithatja. Ha a
 * fejlec HIANYZIK, a korlat NEM szamol (nincs kozos kulcs): egy kozos kulcs egy hibas proxy-beallitasnal az EGESZ boltot
 * kizarna, a bolt sajat, parankenti keretei pedig igy is allnak.
 */
export const KERESES_KORLAT = { max: 20, ablakMs: 10 * 60 * 1000 } as const
export const SZAMLA_KORLAT = { max: 20, ablakMs: 10 * 60 * 1000 } as const

/**
 * A PROBLEMA-BEJELENTES ES A KEPFELTOLTES KERETE (V1.2): a bejelentes ritka, es egy bejelentes legfeljebb ot kepet visz, ezert a
 * bejelentes kerete szuk, a kepeke tagabb. A kettot kulon szamoljuk: egy bejelentes kepei ne fogyasszak a bejelentes keretet.
 */
export const BEJELENTES_KORLAT = { max: 15, ablakMs: 10 * 60 * 1000 } as const
export const FOTO_KORLAT = { max: 40, ablakMs: 10 * 60 * 1000 } as const

export const bejelentesKorlat = (): SebessegKorlat =>
  sebessegKorlat(BEJELENTES_KORLAT)
export const fotoKorlat = (): SebessegKorlat => sebessegKorlat(FOTO_KORLAT)

export const keresesKorlat = (): SebessegKorlat =>
  sebessegKorlat(KERESES_KORLAT)
export const szamlaKorlat = (): SebessegKorlat => sebessegKorlat(SZAMLA_KORLAT)

/** A latogato kulcsa a fejlecbol, vagy `null` (nincs fejlec: nincs kulcs, nincs korlat). */
export function latogatoKulcs(fejlec: {
  get(nev: string): string | null
}): string | null {
  const ertek = fejlec.get("x-real-ip")?.trim()
  return ertek ? ertek : null
}

/** Szabad-e ennek a latogatonak ujabb kerest kuldeni. Kulcs nelkul mindig igen (lasd fent). */
export function engedelyezett(
  korlat: SebessegKorlat,
  kulcs: string | null,
  most?: number,
): boolean {
  return kulcs === null ? true : korlat.allow(kulcs, most)
}
