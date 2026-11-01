import { createHash } from "crypto"

import type { HomepageNewsletter } from "../homepage-content/service"

/**
 * THE ROW BEFORE THE OS SETS ONE (`newsletter: null`), word for word the old
 * shop's footer (exchange/marka-sav-2026-10-27/referencia-lablec.png). The
 * storefront shows the same texts for `null`; its spec reads this file, so the
 * consent a sign-up records is the consent the buyer saw.
 */
export const DEFAULT_NEWSLETTER: HomepageNewsletter = {
  enabled: true,
  title: "Hírlevél",
  text: "Iratkozz fel a hírlevelünkre és értesülj elsőként az újdonságokról, akciókról, ajánlatokról!",
  consent_text:
    "Hozzájárulok az adataim kezeléséhez és elfogadom az Adatkezelési tájékoztatót.",
  button: "Feliratkozás",
}

/** The languages the sign-up form can be in (the storefront's `hu` and `en-hu` path segments). */
export const NEWSLETTER_LANGUAGES = ["hu", "en"] as const
export type NewsletterLanguage = (typeof NEWSLETTER_LANGUAGES)[number]
export const DEFAULT_NEWSLETTER_LANGUAGE: NewsletterLanguage = "hu"

/**
 * THE ENGLISH SHOP'S CONSENT SENTENCE for the default row, word for word the storefront's `newsletter.consent` in
 * `lib/i18n/dictionary/en.ts` (its spec reads this file). The English shop shows it only while the row's consent text is the
 * default Hungarian one: a text somebody wrote in the OS is shown as written, in any language.
 */
export const DEFAULT_CONSENT_TEXT_EN =
  "I agree to the processing of my data and accept the Privacy notice."

/**
 * THE CONSENT TEXT THE BUYER SAW, which is the one to record: the row's own text, except that the English form shows the English
 * sentence for the default row. Recording the Hungarian text under an English sign-up would be a consent the buyer never read.
 */
export const shownConsentText = (
  row: Pick<HomepageNewsletter, "consent_text">,
  language: NewsletterLanguage
): string =>
  language === "en" && row.consent_text === DEFAULT_NEWSLETTER.consent_text
    ? DEFAULT_CONSENT_TEXT_EN
    : row.consent_text

/**
 * The consent's version: the first 16 hex digits of the text's SHA-256. The
 * same text is the same version wherever and whenever it was given; a changed
 * word is a new one, without anyone having to remember to bump a number.
 */
export const consentVersion = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16)
