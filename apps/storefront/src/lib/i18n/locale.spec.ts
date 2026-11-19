import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOCALE,
  LOCALES,
  countryOf,
  localeOf,
  otherSegment,
  parseSegment,
  segmentFor,
  segmentInLanguageOf,
} from "./locale"

/**
 * The first path segment carries the language. What must fail: a Hungarian segment read as anything but Hungarian (the existing URLs
 * must not change); `en-hu` not resolving to the region `hu` (every region lookup would miss); an unknown prefix (`de-hu`) read as a
 * language; a case difference changing the page; `segmentFor` not the inverse of `parseSegment`.
 */
describe("parseSegment", () => {
  it("reads the country-only segment as Hungarian, as always", () => {
    expect(parseSegment("hu")).toEqual({ country: "hu", locale: "hu" })
    expect(parseSegment("de")).toEqual({ country: "de", locale: "hu" })
  })

  it("reads <language>-<country> for a language we have", () => {
    expect(parseSegment("en-hu")).toEqual({ country: "hu", locale: "en" })
    expect(parseSegment("EN-HU")).toEqual({ country: "hu", locale: "en" })
  })

  it("does not read an unknown language prefix, the default language's own prefix, or any other shape as a language", () => {
    for (const s of [
      "de-hu",
      "hu-hu",
      "en",
      "en-hun",
      "en-h",
      "en-hu-x",
      "e-hu",
      "",
      "-hu",
      "en_hu",
    ]) {
      expect(parseSegment(s).locale).toBe("hu")
      expect(parseSegment(s).country).toBe(s.toLowerCase())
    }
  })

  it("segmentFor is the inverse of parseSegment for every language", () => {
    for (const locale of LOCALES) {
      expect(parseSegment(segmentFor("hu", locale))).toEqual({
        country: "hu",
        locale,
      })
    }
    expect(segmentFor("HU", "en")).toBe("en-hu")
    expect(segmentFor("hu", DEFAULT_LOCALE)).toBe("hu")
  })

  it("the helpers give the same page in the other language, and the parts", () => {
    expect(otherSegment("hu", "en")).toBe("en-hu")
    expect(otherSegment("en-hu", "hu")).toBe("hu")
    expect(localeOf("en-hu")).toBe("en")
    expect(countryOf("en-hu")).toBe("hu")
    expect(countryOf("hu")).toBe("hu")
  })
})

/**
 * THE CHECKOUT KEEPS THE LANGUAGE (card, 2026-11-19: the English checkout's first step redirected to `/hu/checkout`). What must fail: the page's
 * language dropped (`en-hu` page, `hu` address country -> `hu`); the address's COUNTRY replaced by the page's (the region follows the address); a
 * missing, unknown or odd page segment (a value from a form is user input) turning into anything but the default language.
 */
describe("segmentInLanguageOf", () => {
  it("puts the address's country in the language of the page", () => {
    expect(segmentInLanguageOf("hu", "en-hu")).toBe("en-hu")
    expect(segmentInLanguageOf("hu", "hu")).toBe("hu")
  })

  it("keeps the ADDRESS's country, not the page's", () => {
    expect(segmentInLanguageOf("de", "en-hu")).toBe("en-de")
    expect(segmentInLanguageOf("HU", "en-hu")).toBe("en-hu")
  })

  it("a missing, unknown or odd page segment is the default language", () => {
    for (const odd of [
      undefined,
      null,
      "",
      "de-hu",
      "xx",
      "en-hu/x",
      "../evil",
      7,
      {},
    ])
      expect(segmentInLanguageOf("hu", odd), String(odd)).toBe("hu")
  })
})
