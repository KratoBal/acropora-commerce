/**
 * A BONGESZO AKTUALIS QUERY-JE, RENDEREN KIVUL (FE-7 3. resz).
 *
 * A `useSearchParams` egy statikus (ISR) lapon a komponenst a kiszolgalt
 * HTML-bol kiveszi: Suspense nelkul az epites hibaval all meg, Suspense-szel a
 * fallback kerul a helyere (merve 2026-10-07 egy Next 15.5.24-es
 * probaepitesen). A lapozo linkjei, a rendezes es a vasarlodoboz igy
 * eltunnenek a keresok elol.
 *
 * Ezert: amit a render MUTAT, az a szervertol jon propban; amit egy
 * esemenykezelo vagy effekt a cimbol OLVAS, az innen. Ez csak a bongeszoben
 * fut, a kiszolgalon ures.
 */
export const aktualisKeres = (): URLSearchParams =>
  new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  )
