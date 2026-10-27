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

/**
 * The consent's version: the first 16 hex digits of the text's SHA-256. The
 * same text is the same version wherever and whenever it was given; a changed
 * word is a new one, without anyone having to remember to bump a number.
 */
export const consentVersion = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16)
