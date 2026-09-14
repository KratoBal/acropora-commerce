/**
 * MIT MONDUNK A VEVONEK, HA A KEDVEZMENYKOD NEM MENT AT.
 *
 * SAJAT MODUL, ES NEM KENYELEMBOL: a dontes a `lib/data/cart.ts` fajlban
 * szuletett volna, az viszont `"use server"` es `server-only` fuggosegeket huz,
 * tehat jsdom alatt be sem importalhato -- a repo tobbi adatretegenel ezt mar
 * megmertuk. Egy ott hagyott elagazasra csak a FORRAS SZOVEGERE lehetne
 * allitast irni; itt a VISELKEDESERE lehet.
 *
 * === KET MONDAT, ES A VAGAS NEM FINOMKODAS ===
 *
 *   4xx   a kerest utasitottak el -> a KOD a baj
 *   egyeb (5xx, halozat, hianyzo kosar, allapotkod nelkuli hiba)
 *         -> NEM a kod a baj
 *
 * Egy halozati hibara azt mondani, hogy "ervenytelen a kod", HAZUGSAG: a vevo
 * eldobna egy jo kodot, es nem probalna ujra. A masik iranyu tevedes olcsobb --
 * aki ervenytelen kodra azt olvassa, hogy "most nem ellenorizheto", legfeljebb
 * megegyszer megprobalja.
 *
 * === AMIT NEM TUDTAM MEGMERNI ===
 *
 * Hogy a Medusa PONTOSAN milyen allapottal utasitja el az ismeretlen kodot (400
 * vagy 404), azt nem tudtam lekerdezni: a `/store` vegpontokhoz publikalhato
 * kulcs kell, es az a kiszolgalt lapban nincs benne (masik rendszer kell hozza,
 * nem jogosultsag). A 4xx/egyeb vagas ettol fuggetlenul helyes -- mind a ketto
 * ugyanabba az agba esik.
 */

export const KOD_NEM_ERVENYES = "Ez a kedvezménykód nem érvényes."

export const MOST_NEM_ELLENORIZHETO =
  "A kedvezménykódot most nem tudjuk ellenőrizni. Próbáld meg újra."

/**
 * A HIBA ALLAPOTKODJA, HA VAN.
 *
 * A `@medusajs/js-sdk` `FetchError`-t dob, aminek `status` mezoje van (merve a
 * csomagban: `client.js`, `new FetchError(message, statusText, status)`). A
 * repo `medusaError` segedje `err.response.status` alakot var -- az a REGI,
 * axios-alapu kliens alakja, es a mai SDK hibaira nem illeszkedik.
 */
export function hibaAllapota(hiba: unknown): number | undefined {
  if (typeof hiba !== "object" || hiba === null) return undefined
  if (!("status" in hiba)) return undefined
  const ertek = Number((hiba as { status: unknown }).status)
  return Number.isFinite(ertek) ? ertek : undefined
}

/** A vevonek szant mondat, az allapotkodbol. */
export function kedvezmenyUzenet(allapot: number | undefined): string {
  return allapot !== undefined && allapot >= 400 && allapot < 500
    ? KOD_NEM_ERVENYES
    : MOST_NEM_ELLENORIZHETO
}
