"use client"

import { useParams } from "next/navigation"

import { translator, type Translate } from "./dictionary"
import { localeOf, type Locale } from "./locale"
import { useVevoiSzovegek } from "./vevoi-szovegek-kontextus"

/** The language of the page a client component sits on (the first path segment), Hungarian where there is no segment. */
export const useLocale = (): Locale =>
  localeOf(String(useParams()?.countryCode ?? "hu"))

/**
 * The translator of a language for a client component, with the customer texts edited in the OS (card 7bfca4eb) laid over the
 * dictionary. For a component that gets its language as a prop (`countryCode`) rather than from the path.
 */
export const useTranslateFor = (locale: Locale): Translate =>
  translator(locale, useVevoiSzovegek(locale))

/** The translator of the page a client component sits on. */
export const useTranslate = (): Translate => useTranslateFor(useLocale())
