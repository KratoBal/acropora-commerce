/**
 * A FORMAZOTT ("ROVID") SZOVEGEK KOTOTT HELYEI A KEZDOLAPON (Balazs 2b
 * megbizas, 4. pont; nautilus 36040). Csak ezek a kulcsok (es a hero-dia
 * szovege) lehetnek HTML-ek; minden mas szoveg tovabbra is sima szoveg.
 */
export const ROVID_KULCSOK: ReadonlySet<string> = new Set([
  "kezdo.szoveg",
  "kezdo.1.szoveg",
  "kezdo.2.szoveg",
  "kezdo.3.szoveg",
])

/** Egy ertek HTML-alaku-e: van benne a "short" profil valamelyik cimkeje. */
export const htmlAlaku = (ertek: string): boolean =>
  /<\/?(p|br|strong|b|em|i|ul|ol|li|a)(\s[^>]*)?\/?>/i.test(ertek)

/** A cimkek nelkuli szoveg: amit a lap akkor mutat, ha az ertek nem tisztitott. */
export const cimkeNelkul = (ertek: string): string =>
  ertek
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|li|ul|ol)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()

export type RovidErtek = { html: string } | { szoveg: string }

/**
 * A MEGJELENITENDO ALAK. HTML CSAK AKKOR, HA a tartalom a szerveren a
 * tisztitason atment (`tisztitott`) ES az ertek HTML-alaku; egyebkent sima
 * szoveg (a HTML-alaku, de tisztitatlan ertekrol a cimkek lekerulnek). Egy
 * komponens, amely a tisztitast kihagyja, ezert nem tud HTML-t kirajzolni: a
 * biztonsagos alap a szoveg.
 */
export function rovidErtek(ertek: string, tisztitott: boolean): RovidErtek {
  if (!htmlAlaku(ertek)) return { szoveg: ertek }
  return tisztitott ? { html: ertek } : { szoveg: cimkeNelkul(ertek) }
}
