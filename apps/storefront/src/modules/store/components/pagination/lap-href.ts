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
