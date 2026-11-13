import type { OrderLocale } from "../order-locale"
import { storefrontPageUrl } from "./order-view-url"

/**
 * THE ASZF AND PRIVACY-NOTICE PAGES' ADDRESSES FOR THE ORDER CONFIRMATION (acrobot 50140). The old shop attached the two
 * documents as PDFs; here the Fogyasztóbarát binds its documents to the registered domain (a server request gets error 1002 and
 * faking the Referer is forbidden), so the mail carries LINKS to the storefront's own pages (`/<country>/jogi/aszf` and
 * `/<country>/jogi/adatkezeles`) and the browser fetches the documents there.
 *
 * BEHIND THE SAME SWITCH AS THE OTHER FOGYASZTÓBARÁT ELEMENTS: `NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED`, exactly `true` (the storefront's
 * `fogyasztobaratBekapcsolva`). The name is the storefront's; THIS backend must be given the same variable with the same value, or
 * the mail sends no links (the safe direction: the pages are still the storefront's own text without the switch, but the
 * mail must not point at documents the shop does not serve yet).
 *
 * A fact, not a sentence: the OS writes the words. Both addresses or null, so the OS never draws half a sentence.
 */
export const FOGYASZTOBARAT_SWITCH = "NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED"

export type LegalUrls = { aszf: string; adatkezeles: string }

export const legalUrls = (env: NodeJS.ProcessEnv, locale: OrderLocale): LegalUrls | null => {
  if (env[FOGYASZTOBARAT_SWITCH]?.trim() !== "true") return null
  const aszf = storefrontPageUrl(env, locale, "jogi/aszf")
  const adatkezeles = storefrontPageUrl(env, locale, "jogi/adatkezeles")
  return aszf && adatkezeles ? { aszf, adatkezeles } : null
}
