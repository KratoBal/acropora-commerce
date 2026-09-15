import { hibaAllapota } from "./kedvezmeny-uzenet"

/**
 * MIT MONDUNK A VEVONEK, HA A PENZTAR EGYIK LEPESE NEM MENT AT.
 *
 * === MIERT KELL EGYALTALAN SAJAT MONDAT ===
 *
 * Mind a harom lepes (szallitasi mod, fizetesi mod elokeszitese, rendeles
 * leadasa) szerver-muveletet hiv, es a komponens eddig a DOBOTT kivetel
 * `message` erteket rajzolta ki. Fejlesztoi gepen ez mukodik, produkcioban
 * NEM: a Next a szerver-muveletbol dobott hiba uzenetet lecsereli egy
 * altalanos angol mondatra es egy digestre. A vevo tehat a PENZTARBAN is azt
 * az angol mentoszoveget latta volna, amit a kedvezmenykodnal mar lemertunk
 * (#371, digest 2352313220).
 *
 * A hatart nem a dobas ATIRASA lepi at, hanem a VISSZATERES.
 *
 * === HAROM LEPES, HAROM MONDATPAR, ES NEM EGY KOZOS ===
 *
 * A vagas mindharomnal ugyanaz (4xx kontra minden mas), a MONDATOK viszont nem
 * lehetnek ugyanazok: a vevo mas teendot kap attol, hogy a szallitasi modot
 * kell-e ujravalasztania, vagy a fizetesi modot, vagy azt kell megneznie,
 * atment-e a rendelese. Egy kozos „valami hiba tortent" mondat pontosan azt
 * veszi el, amiert az egeszet csinaljuk.
 *
 * === A RENDELES MONDATA KULON GONDOLKODAST KIVANT ===
 *
 * A masik kettonel a „probald ujra" biztonsagos. A rendelesnel NEM: ha a hiba
 * a valasz utjan keletkezett, a rendeles LEHET, hogy letrejott, es egy vak
 * ujraprobalas masodik rendelest szulhet.
 *
 * ES NEM MERTEM MEG, hogy a Medusa `cart.complete` hivasa idempotens-e (ahhoz
 * valodi rendelest kellene inditani az eles bolton -- azt nem teszek). Ezert a
 * mondat NEM mondja azt, hogy „probald ujra", es azt sem, hogy „ne probald":
 * arra keri a vevot, hogy ELOBB NEZZE MEG. Ez mindket lehetseges vilagban
 * helyes tanacs, es egyikben sem karos.
 */

export const SZALLITAS_ELUTASITVA =
  "Ezt a szállítási módot nem tudtuk beállítani. Válassz másikat."

export const SZALLITAS_MOST_NEM_SIKERULT =
  "A szállítási mód beállítása most nem sikerült. Próbáld meg újra."

export const FIZETES_ELUTASITVA =
  "Ezt a fizetési módot nem tudtuk elindítani. Válassz másikat."

export const FIZETES_MOST_NEM_SIKERULT =
  "A fizetés előkészítése most nem sikerült. Próbáld meg újra."

export const RENDELES_ELUTASITVA =
  "A rendelést nem tudtuk leadni. Nézd át a kosarat és a megadott adatokat."

export const RENDELES_MOST_NEM_SIKERULT =
  "A rendelés leadása most nem sikerült. Mielőtt újra próbálod, nézd meg a rendeléseid között, hogy megérkezett-e."

/** A 4xx a vevo valasztasara mutat, minden mas a kapcsolatra. */
function vagas(
  allapot: number | undefined,
  elutasitva: string,
  egyeb: string,
): string {
  return allapot !== undefined && allapot >= 400 && allapot < 500
    ? elutasitva
    : egyeb
}

export function szallitasUzenet(allapot: number | undefined): string {
  return vagas(allapot, SZALLITAS_ELUTASITVA, SZALLITAS_MOST_NEM_SIKERULT)
}

export function fizetesUzenet(allapot: number | undefined): string {
  return vagas(allapot, FIZETES_ELUTASITVA, FIZETES_MOST_NEM_SIKERULT)
}

export function rendelesUzenet(allapot: number | undefined): string {
  return vagas(allapot, RENDELES_ELUTASITVA, RENDELES_MOST_NEM_SIKERULT)
}

export { hibaAllapota }
