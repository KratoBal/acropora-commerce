/**
 * A LAPOZO EGY LAPJANAK CIME (SEO frontend FE-1, 2026-10-07).
 *
 * A lapozo eddig `<button onClick>`-kal `router.push`-olt: a kereso a 2.,
 * 3. ... lapot nem talalta meg, mert nem volt mogotte link. Most minden lap egy
 * valodi `<a href>`, es ez a fuggveny adja a cimet.
 *
 * AZ 1. LAPNAK NINCS `page` PARAMETERE: ugyanaz a lap ket cimen (`?page=1` es
 * parameter nelkul) ket URL lenne ugyanarra a tartalomra. A tobbi szuro- es
 * rendezes-parameter marad, ahogy volt.
 */
export function lapHref(
  pathname: string,
  keresoParameterek: string,
  lap: number,
): string {
  const params = new URLSearchParams(keresoParameterek)
  if (lap <= 1) params.delete("page")
  else params.set("page", String(lap))
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * A LAPOZO LINKJEINEK QUERY-JE, A SZERVERTOL (FE-7 3. resz).
 *
 * A lapozo eddig `useSearchParams`-bol vette, de egy statikus (ISR) lapon az a
 * komponenst kiveszi a HTML-bol (merve 2026-10-07, Next 15.5.24), es akkor a
 * kereso epp a lapozo linkjeit nem latja. A lap torzse mar ertelmezte a
 * cimet, tehat a query innen jon: a `page` nelkul (azt a `lapHref` teszi bele
 * lapszamonkent), a szurok es a rendezes valtozatlanul. A statikus lapon ez
 * ures, a szurt (dinamikus) lapon a szurok.
 */
export function lapozoKeres(
  keres: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [kulcs, ertek] of Object.entries(keres)) {
    if (kulcs === "page" || ertek === undefined) continue
    for (const egy of Array.isArray(ertek) ? ertek : [ertek])
      params.append(kulcs, egy)
  }
  return params.toString()
}

/**
 * A LAPOZO CELJA A SZERVERTOL (FE-7 3. resz): a NYILVANOS alap-ut es a query.
 *
 * Az alap-utat sem a `usePathname` adja: a `_p/N` lap a belso uton renderelodik,
 * es ha egy rendereles (peldaul a hatterben futo ujraervenyesites) a belso utat
 * latna, a linkek `/_p/...`-re mutatnanak, amit kivulrol 404 fogad (barracuda
 * vegleges review, acrobot 27511). A lap torzse tudja a nyilvanos cimet.
 */
export type LapozoCel = { alap: string; keres: string }
