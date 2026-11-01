/**
 * THE SHOP'S LANGUAGES, AND HOW THE FIRST PATH SEGMENT CARRIES THEM (Balázs 2026-11-01: Hungarian and English).
 *
 * WHY THE LANGUAGE IS IN THE URL AND NOWHERE ELSE: the shop's pages are ISR (`generateStaticParams` + `revalidate`) and public pages
 * answer without a cookie (`middleware-suti.spec.ts`). A cookie or a header would make every page dynamic, and one cached page
 * could serve both languages. The path segment is the cache key: `/hu/...` and `/en-hu/...` are two pages.
 *
 * THE SEGMENT IS `<country>` (Hungarian, as before: no URL changes, no redirects) or `<language>-<country>` (`en-hu`: English, region
 * Hungary). Everything that builds a link from `countryCode` (`/${countryCode}/...`) keeps the language by itself; everything that
 * needs the REGION (Medusa's `getRegion`, the region map of the middleware, an address form's country) takes the country part here.
 */
export const LOCALES = ["hu", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "hu"

export type SegmentParts = { country: string; locale: Locale }

/** A language prefix in a path segment: two letters, a dash, two letters, the first a NON-default language we have. */
const PREFIXED = /^([a-z]{2})-([a-z]{2})$/

/**
 * `hu` -> { country: "hu", locale: "hu" }; `en-hu` -> { country: "hu", locale: "en" }.
 * Anything else (an unknown language prefix, `de-hu`, a longer string) is NOT a language segment: it is returned as a country as it
 * is, so the region lookup fails the way it always did for an unknown segment.
 */
export const parseSegment = (segment: string): SegmentParts => {
  const lower = (segment ?? "").toLowerCase()
  const m = PREFIXED.exec(lower)
  if (m) {
    const locale = m[1] as Locale
    if (LOCALES.includes(locale) && locale !== DEFAULT_LOCALE)
      return { country: m[2]!, locale }
  }
  return { country: lower, locale: DEFAULT_LOCALE }
}

/** The segment for a country in a language: the inverse of `parseSegment`. */
export const segmentFor = (country: string, locale: Locale): string =>
  locale === DEFAULT_LOCALE
    ? country.toLowerCase()
    : `${locale}-${country.toLowerCase()}`

/** The same page in another language: `hu` <-> `en-hu` (the path after the segment is the caller's). */
export const otherSegment = (segment: string, locale: Locale): string =>
  segmentFor(parseSegment(segment).country, locale)

/** The language of a path segment (the page's own). */
export const localeOf = (segment: string): Locale =>
  parseSegment(segment).locale

/** The country (region) part of a path segment. */
export const countryOf = (segment: string): string =>
  parseSegment(segment).country
