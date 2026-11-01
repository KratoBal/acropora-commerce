"use client"

import { useEffect } from "react"

/**
 * THE PAGE'S LANGUAGE ON `<html lang>`, for the pages that are not Hungarian (`/en-hu/...`).
 *
 * The root layout (`app/layout.tsx`) carries the `<html>` element and has no route params, so it cannot know the language of the
 * path; it stays `hu`. An inline script would be the usual fix, but the shop's CSP (report-only today) would report it. This sets the
 * attribute after hydration instead, and gives it back when the page is left. It is the accessibility attribute only: search engines
 * read the content and the (later) hreflang links, and the English pages are `noindex` until the whole shop is translated. The full
 * answer is to split the root layout by language, a separate change.
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement
    const before = root.lang
    root.lang = lang
    return () => {
      root.lang = before
    }
  }, [lang])
  return null
}
