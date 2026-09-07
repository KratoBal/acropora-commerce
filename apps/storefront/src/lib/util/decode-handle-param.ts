/**
 * A CIMBEN ALLO HANDLE VISSZAFEJTESE -- ES MIERT KELL EGYALTALAN.
 *
 * MERVE 2026-09-07, a futo kirakaton, a teszt Medusa ellen. A `/hu/categories/
 * term%C3%A9kek` cim 404-et adott, mikozben ugyanaz a handle a Store API-n
 * megvan (HTTP 200, egy talalat). A dev szerver kimeno keresenek naploja
 * mondta meg, miert:
 *
 *     ...?handle=term%25C3%25A9kek
 *
 * A `%25` a `%` jel kodolt alakja. Vagyis az utvonal-szegmens MAR KODOLVA
 * erkezik a `params`-ban, az SDK pedig MEGEGYSZER kodolja -- a Medusa igy egy
 * szo szerint `term%C3%A9kek` nevu handle-t keres, es nem talal.
 *
 * A HATOKORE NEM ELMELETI: a teszt boltban 219 kategoriabol 181 (83 szazalek)
 * es 19 termekbol 2 visel ekezetes handle-t. Ekezet nelkuli handle-lel
 * ugyanezek az oldalak 200-at adnak -- ez az ismert pozitiv kontroll, ami
 * kimondja, hogy a hiba az ekezetnel van, nem a lapnal.
 *
 * MIERT ITT, ES NEM AZ ADAT-RETEGBEN: a kodolas a CIM tulajdonsaga, nem a
 * handle-e. Az adat-fuggvenyek mar kesz handle-t kapnak, es masok is hivjak
 * oket (peldaul a `generateStaticParams`, ami a nyers handle-t adja at). Ha
 * ott fejtenenk vissza, egy nyers handle-ben allo `%` jelet is elrontanank.
 *
 * A `decodeURIComponent` hibas alakra kivetelt dob (peldaul egy maganyos `%`
 * jelre). Ilyenkor az EREDETI erteket adjuk vissza: az ugyanugy nem fog
 * talalni, de a lap 404-et ad, nem 500-at -- a rossz cim nem a mi hibank.
 */
export function decodeHandleParam(handle: string): string {
  try {
    return decodeURIComponent(handle);
  } catch {
    return handle;
  }
}

/** Ugyanaz, a `[...catchAll]` szegmens-listakra. */
export function decodeHandleParams(handles: string[]): string[] {
  return handles.map(decodeHandleParam);
}
