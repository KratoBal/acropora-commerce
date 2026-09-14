import { hibaAllapota } from "./kedvezmeny-uzenet"

/**
 * MIT MONDUNK A VEVONEK, HA A KOSAR MENNYISEGE NEM MENT AT.
 *
 * === MIERT KELL EGYALTALAN SAJAT MONDAT ===
 *
 * A `updateLineItem` eddig DOBOTT (a `medusaError` segeden at), a komponens
 * pedig elkapta es kirajzolta a kivetel `message` erteket. Ez FEJLESZTOI GEPEN
 * mukodik, produkcioban viszont nem: a Next a szerver-muveletbol DOBOTT hiba
 * uzenetet lecsereli egy altalanos angol mondatra ("An error occurred in the
 * Server Components render...") es egy digestre. A vevo tehat pontosan azt az
 * angol mentoszoveget latta volna, amit a kedvezmenykodnal mar lemertunk
 * (#371, digest 2352313220).
 *
 * A hatart nem a dobas ATIRASA lepi at, hanem a VISSZATERES: egy visszaadott
 * ertek valtozatlanul atmegy a hataron.
 *
 * === KET MONDAT, ES A VAGAS UGYANAZ, MINT A KEDVEZMENYKODNAL ===
 *
 *   4xx   a kerest ELUTASITOTTAK -> a kert mennyiseg a baj
 *   egyeb (5xx, halozat, hianyzo kosar, allapotkod nelkuli hiba)
 *         -> NEM a mennyiseg a baj, a muvelet nem jutott el odaig
 *
 * ES AMIT A 4xx AGRA SZANDEKOSAN NEM MONDUNK KI: hogy "nincs ennyi
 * keszleten". A Medusa 4xx-e tobbfele validaciot takar (keszlet, nem letezo
 * sor, rossz mennyiseg), es a kettot ebbol a valaszbol nem tudjuk
 * megkulonboztetni. Egy kitalalt ok rosszabb a semminel: a vevo a rossz
 * dolgot probalna megjavitani.
 *
 * === A `hibaAllapota` HELYEROL ===
 *
 * Az a fuggveny ALTALANOS (barmelyik SDK-hiba allapotkodjat kiolvassa), es ma
 * a `kedvezmeny-uzenet.ts` fajlban all, mert ott szuletett. Ket fogyasztoja
 * van (`cart.ts` es `medusa-error.ts`), ez a harmadik. Ha a penztar-ut
 * javitasa is hozza a magaet, sajat, semleges modulba valo -- addig a
 * koltoztetes tobb valtozast vinne a diffbe, mint amennyit er.
 */

export const MENNYISEG_ELUTASITVA =
  "Ezt a mennyiséget nem tudtuk beállítani. Próbálj meg kevesebbet."

export const KOSAR_MOST_NEM_SIKERULT =
  "A kosár frissítése most nem sikerült. Próbáld meg újra."

/** A vevonek szant mondat, a hiba allapotkodjabol. */
export function kosarUzenet(allapot: number | undefined): string {
  return allapot !== undefined && allapot >= 400 && allapot < 500
    ? MENNYISEG_ELUTASITVA
    : KOSAR_MOST_NEM_SIKERULT
}

export { hibaAllapota }
