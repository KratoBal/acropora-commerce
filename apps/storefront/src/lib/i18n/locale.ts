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

/**
 * A COUNTRY'S SEGMENT IN THE LANGUAGE OF THE PAGE THE VISITOR IS ON: `hu` and the page `en-hu` give `en-hu`. The checkout builds its
 * next address from the COUNTRY of the shipping address (the region can change with it) and used to write only that, so the first
 * step of an English checkout landed on `/hu/checkout` and the rest of the checkout, and the order confirmation, were Hungarian
 * (measured on the test shop, 2026-11-19). The language is the page's: a missing or unknown page segment is the default language.
 */
export const segmentInLanguageOf = (
  country: string,
  pageSegment: unknown,
): string =>
  segmentFor(
    // the country is a form field too (the address's `country_code`): only two letters can be a country, anything else (a path, a host, a
    // slash) is not put into the redirect's path (barracuda #841); the cart update refuses the same value for the address
    /^[a-z]{2}$/i.test(country) ? country : "hu",
    typeof pageSegment === "string" ? localeOf(pageSegment) : DEFAULT_LOCALE,
  )
