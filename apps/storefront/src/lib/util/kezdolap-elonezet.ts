/**
 * A KEZDOLAP ELO ELONEZETE (OS <-> teszt kirakat, protokoll v1, nautilus
 * 2026-10-26; agents/nautilus/atadas/kezdolap-2026-10-26/elonezet-protokoll.md).
 *
 * Az elonezeti utvonal (`/{orszagkod}/kezdolap-elonezet`) CSAK a teszt
 * kirakaton el (`HOMEPAGE_PREVIEW_ENABLED=true`); maskor 404. Az OS iframe-ben
 * nyitja, ezert KET KORLATOT kap: a `frame-ancestors` egyetlen, konfiguralt OS
 * cimre szol (`ACROPORA_OS_ORIGIN`), `noindex`, nincs gyorsitotar.
 *
 * A MIDDLEWARE tesz fejleceket, nem a `next.config`: a fejlec ERTEKE futasidejui
 * kornyezeti valtozo, a `next.config` fejlecei epiteskor rogzulnek. A tiszta
 * fuggvenyek itt allnak, hogy a kornyezet nelkul is meresek legyenek.
 */

const UTVONAL = /^\/[a-z]{2}\/kezdolap-elonezet\/?$/i

/** Az elonezeti utvonal-e (a `/hu/kezdolap-elonezet` alak, az orszagkoddal). */
export const elonezetiUt = (pathname: string): boolean => UTVONAL.test(pathname)

/** Be van-e kapcsolva: CSAK a pontos `true`; minden mas (hiany, `1`, `TRUE`) ki. */
export const elonezetBekapcsolva = (
  env: Record<string, string | undefined>,
): boolean => env.HOMEPAGE_PREVIEW_ENABLED === "true"

/**
 * AZ OS CIME, HA EGY ERVENYES ORIGIN: `http(s)://host[:port]`, utvonal, query,
 * hitelesites es joker nelkul. Minden mas `null`, es a `null` a KEREKET ZARJA
 * (`frame-ancestors 'none'`, a postMessage cel nelkul nem megy): egy elgepelt
 * beallitas sosem nyit meg tobbet, mint amit a beallito akart.
 */
export function osOrigin(
  env: Record<string, string | undefined>,
): string | null {
  const nyers = env.ACROPORA_OS_ORIGIN?.trim()
  if (!nyers || /[*\s;,'"]/.test(nyers)) return null
  try {
    const url = new URL(nyers)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    if (url.origin !== nyers.replace(/\/$/, "")) return null
    return url.origin
  } catch {
    return null
  }
}

/** Az elonezeti oldal valasz-fejlecei. */
export function elonezetFejlecek(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const origin = osOrigin(env)
  return {
    "Content-Security-Policy": `frame-ancestors ${origin ?? "'none'"}`,
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "private, no-store",
  }
}
