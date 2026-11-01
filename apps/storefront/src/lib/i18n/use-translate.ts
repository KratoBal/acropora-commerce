"use client"

import { useParams } from "next/navigation"

import { translator, type Translate } from "./dictionary"
import { localeOf, type Locale } from "./locale"

/** The language of the page a client component sits on (the first path segment), Hungarian where there is no segment. */
export const useLocale = (): Locale =>
  localeOf(String(useParams()?.countryCode ?? "hu"))

/** The translator of the page a client component sits on. */
export const useTranslate = (): Translate => translator(useLocale())
