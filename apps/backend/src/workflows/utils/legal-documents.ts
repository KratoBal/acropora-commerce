/**
 * THE LEGAL DOCUMENTS THE CHECKOUT NEEDS BEFORE IT TAKES AN ORDER (card
 * f6cb0a51, item 2; Balázs 2026-11-02 00:28 UTC: "the ÁSZF comes from
 * Fogyasztóbarát, in English too").
 *
 * The texts are not ours: Fogyasztóbarát keeps the ÁSZF and the privacy notice
 * and the shop shows them. So the gate does not read a text, it asks whether the
 * SOURCE of each required document is configured: terms and privacy, Hungarian
 * and English. Anything missing and the checkout refuses (aszf-guard.ts), with
 * one plain message, instead of taking an order under documents the customer
 * could not have been shown.
 *
 * === WHAT IS CONFIGURED, AND WHAT IS STILL OPEN ===
 *
 * - `FOGYASZTOBARAT_ENABLED` must be "true": with it off the shop shows the old
 *   shop's ÁSZF, which is not a Fogyasztóbarát document in either language.
 * - `FOGYASZTOBARAT_ID_HU`: the shop id of the Hungarian documents. Defaults to
 *   the shop's current id (the storefront's own default), and must equal the
 *   storefront's `NEXT_PUBLIC_FOGYASZTOBARAT_ID`.
 * - `FOGYASZTOBARAT_ID_EN`: the English source. No default, on purpose: how
 *   Fogyasztóbarát serves the English documents (the same id with another key or
 *   parameter, or a separate id) is not known yet, and its API answers only a
 *   registered domain's Referer, so it could not be measured. Empty means the
 *   checkout does not take an order. FILLING IT OPENS THE GATE, NOT THE ENGLISH
 *   RECORD: the record (aszf-record.ts) names the Hungarian document, and an
 *   English acceptance is refused (`language_unsupported`, checkAszfClaim) until
 *   the real shape is known. Taking the English record live needs more than this
 *   setting: `currentAszfRecord` and `checkAszfClaim` in aszf-record.ts, and the
 *   storefront's `ASZF_ELFOGADAS_NYELV` (aszf.ts), which today is a constant and
 *   must then come from the document actually shown.
 * - `FOGYASZTOBARAT_REQUIRE_EN`: TEST BACKEND ONLY, never on the live one. Exactly
 *   "false" stops the gate from requiring the English source (acrobot 2026-11-02),
 *   so the Hungarian checkout can run while the English documents do not exist.
 */
export const FOGYASZTOBARAT_DEFAULT_ID_HU = "JPNFMVH0"

/** `api.php` keys of the two required documents (storefront JOGI_DOKUMENTUMOK). */
export const LEGAL_DOCUMENT_KEYS = { aszf: "aszf", privacy: "at" } as const

const SHOP_ID = /^[A-Za-z0-9]{1,32}$/

export type LegalConfig = {
  enabled: boolean
  hu: string | null
  en: string | null
  /** False only for the exact value "false": the English source is then not required. */
  requireEn: boolean
}

export type LegalEnv = Record<string, string | undefined>

const shopId = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed && SHOP_ID.test(trimmed) ? trimmed : null
}

/** The configuration as it stands in the environment; a malformed id counts as not set. */
export const readLegalConfig = (env: LegalEnv = process.env): LegalConfig => ({
  enabled: env.FOGYASZTOBARAT_ENABLED?.trim() === "true",
  hu: env.FOGYASZTOBARAT_ID_HU === undefined ? FOGYASZTOBARAT_DEFAULT_ID_HU : shopId(env.FOGYASZTOBARAT_ID_HU),
  en: shopId(env.FOGYASZTOBARAT_ID_EN),
  requireEn: env.FOGYASZTOBARAT_REQUIRE_EN?.trim() !== "false",
})

export type LegalReadiness = { complete: true } | { complete: false; missing: string[] }

/** What is missing, by name, so a refusal in the log says which setting to look at. */
export const legalReadiness = (config: LegalConfig = readLegalConfig()): LegalReadiness => {
  const missing: string[] = []
  if (!config.enabled) missing.push("FOGYASZTOBARAT_ENABLED")
  if (!config.hu) missing.push("FOGYASZTOBARAT_ID_HU")
  if (config.requireEn && !config.en) missing.push("FOGYASZTOBARAT_ID_EN")
  return missing.length === 0 ? { complete: true } : { complete: false, missing }
}

/**
 * The code the storefront matches to show its own sentence (the same way it
 * matches `split_discount_changed`): the Medusa SDK hands over only the message.
 */
export const LEGAL_NOT_READY_CODE = "legal_documents_missing"

/** The refusal: the code, then a sentence for a reader who sees it as it is (Hungarian first, English after). */
export const LEGAL_NOT_READY =
  LEGAL_NOT_READY_CODE +
  ": A rendelés jelenleg nem adható le: az ÁSZF és az adatkezelési tájékoztató még nincs közzétéve. " +
  "Orders cannot be placed right now: the terms and the privacy notice are not published yet."

/** A document's source at Fogyasztóbarát. */
export const legalSource = (key: string, id: string) =>
  `https://admin.fogyasztobarat.hu/api.php?${encodeURIComponent(key)}=${encodeURIComponent(id)}`
