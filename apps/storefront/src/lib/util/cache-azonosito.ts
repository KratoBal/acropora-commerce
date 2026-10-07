/**
 * A `_medusa_cache_id` SUTI: KINEK KELL (FE-7 3. resz).
 *
 * A suti a latogato SAJAT gyorsitotar-cimkeit adja (`carts-<id>`,
 * `customers-<id>`): a kosar- es fiok-muveletek ezeket uritik. Eddig a
 * middleware MINDEN suti nelkuli valaszra rarakta, a publikus lapokra is, es
 * egy `Set-Cookie`-t hordozo valaszt egy CDN nem tarol (merve 2026-10-07 a
 * helyi epitesen: mind a tiz laptipus `Set-Cookie`-val ment ki).
 *
 * Most csak annak jar, akinek van mit uritenie: akinek kosara vagy belepese
 * van. Az uj kosar es az uj belepes a sajat muveleteben kapja meg
 * (`setCartId`, `setAuthToken`), a middleware pedig potolja annak, akinek a
 * kosara vagy a belepese megvan, de a 24 oras cache-suti lejart.
 */
export const CACHE_AZONOSITO_SUTI = "_medusa_cache_id"
export const CACHE_AZONOSITO_ELETTARTAM_MP = 60 * 60 * 24

const ALLAPOT_SUTIK = ["_medusa_cart_id", "_medusa_jwt"]

export function cacheAzonositoKell(sutik: {
  has: (nev: string) => boolean
}): boolean {
  if (sutik.has(CACHE_AZONOSITO_SUTI)) return false
  return ALLAPOT_SUTIK.some((nev) => sutik.has(nev))
}
